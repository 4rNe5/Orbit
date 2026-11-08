"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { analyzeCompletion, type CompletionAnalysis } from "@/lib/core/completion";
import { analyze, indexCharts, type ChartIndex } from "@/lib/core/rating";
import type { Chart, Lamp, RatingAnalysis, ScoreEntry, ScoreMap } from "@/lib/core/types";
import { loadCharts, type DataVersion } from "@/lib/data/charts";
import { currentLocale, defineDict, translate } from "@/lib/i18n";
import { selectAll, supabase } from "@/lib/supabase";

const T = defineDict({
  ko: {
    loadCharts: "곡 데이터를 불러오지 못했습니다. {msg}",
    saveFailed: "저장하지 못했습니다. 입력은 이 기기에 보관했다가 다시 보냅니다. ({msg})",
    moved: "이 기기에 저장된 점수 {n}개를 계정으로 옮겼습니다.",
    loadScores: "점수를 불러오지 못해 저장을 멈췄습니다. 새로고침해 주세요. ({msg})",
    blocked: "점수를 불러오지 못한 상태라 저장하지 않았습니다. 새로고침해 주세요.",
    deleteFailed: "삭제하지 못했습니다. {msg}",
    deleted: "모든 점수를 삭제했습니다.",
    signedOut: "로그아웃했습니다.",
  },
  ja: {
    loadCharts: "楽曲データを読み込めませんでした。{msg}",
    saveFailed: "保存できませんでした。入力内容はこの端末に保管し、あとで再送します。({msg})",
    moved: "この端末に保存されていたスコア {n} 件をアカウントに移しました。",
    loadScores: "スコアを読み込めなかったため保存を停止しました。再読み込みしてください。({msg})",
    blocked: "スコアを読み込めていないため保存しませんでした。再読み込みしてください。",
    deleteFailed: "削除できませんでした。{msg}",
    deleted: "すべてのスコアを削除しました。",
    signedOut: "ログアウトしました。",
  },
  zh: {
    loadCharts: "无法加载曲目数据。{msg}",
    saveFailed: "保存失败。输入内容已保存在本设备，稍后会重新上传。({msg})",
    moved: "已将本设备上的 {n} 条分数移至账号。",
    loadScores: "无法加载分数，已暂停保存。请刷新页面。({msg})",
    blocked: "分数尚未加载，未进行保存。请刷新页面。",
    deleteFailed: "删除失败。{msg}",
    deleted: "已删除所有分数。",
    signedOut: "已退出登录。",
  },
});
const tr = (k: keyof typeof T.ko, vars?: Record<string, string | number>) => translate(T, currentLocale(), k, vars);

export interface Profile {
  user_id: string;
  handle: string;
  display_name: string;
  is_public: boolean;
  show_completion: boolean;
}

export interface Snapshot {
  rating: number;
  completion_percent: number | null;
  played: number;
  created_at: string;
}

interface Toast {
  id: number;
  text: string;
  tone: "info" | "error";
}

/** A score going up or a lamp changing (mirrors public.score_events). Newest first in state. */
export interface ScoreEvent {
  chartId: string;
  score: number;
  prevScore: number | null;
  lamp: Lamp;
  prevLamp: Lamp | null;
  at: string;
}

interface EventRow {
  chart_id: string;
  score: number;
  prev_score: number | null;
  lamp: Lamp;
  prev_lamp: Lamp | null;
  created_at: string;
}
const EVENT_COLS = "chart_id, score, prev_score, lamp, prev_lamp, created_at";
const toEvent = (r: EventRow): ScoreEvent => ({ chartId: r.chart_id, score: r.score, prevScore: r.prev_score, lamp: r.lamp, prevLamp: r.prev_lamp, at: r.created_at });

/** Same rule as the database trigger: a new chart, a higher score, or a different lamp. */
function diffEvents(prev: ScoreMap, changed: Record<string, ScoreEntry | null>, at: string): ScoreEvent[] {
  const out: ScoreEvent[] = [];
  for (const [id, e] of Object.entries(changed)) {
    if (!e) continue;
    const p = prev[id];
    if (!p || e.score > p.score || e.lamp !== p.lamp) out.push({ chartId: id, score: e.score, prevScore: p?.score ?? null, lamp: e.lamp, prevLamp: p?.lamp ?? null, at });
  }
  return out;
}
const sameEvent = (a: ScoreEvent, b: ScoreEvent) => a.chartId === b.chartId && a.score === b.score && a.lamp === b.lamp && a.prevScore === b.prevScore;

export interface ApplyResult {
  changed: number;
  saved: boolean;
}

interface AppState {
  ready: boolean;
  error: string | null;
  /** Set when cloud scores could not be loaded; writes are paused so nothing gets overwritten. */
  syncError: string | null;
  version: DataVersion | null;
  index: ChartIndex | null;
  charts: Chart[];
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  scores: ScoreMap;
  scoresLoading: boolean;
  syncing: boolean;
  analysis: RatingAnalysis | null;
  completion: CompletionAnalysis | null;
  setScore: (chartId: string, entry: ScoreEntry | null) => void;
  /** Sets a score keeping the current lamp (1,010,000 always counts as AP). */
  setScoreValue: (chartId: string, score: number | null) => void;
  setLamp: (chartId: string, lamp: Lamp) => void;
  applyScores: (incoming: ScoreMap, mode: "max" | "overwrite") => Promise<ApplyResult>;
  clearScores: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  toast: (text: string, tone?: "info" | "error") => void;
  toasts: Toast[];
  snapshots: () => Promise<Snapshot[]>;
  /** Most recent score events (cloud: last 300, local: last 3000). */
  events: ScoreEvent[];
  /** Full history for these charts, newest first. */
  chartEvents: (chartIds: string[]) => Promise<ScoreEvent[]>;
}

const Ctx = createContext<AppState | null>(null);

const LOCAL_SCORES = "orbit:scores:v1";
const LOCAL_SNAPSHOTS = "orbit:snapshots:v1";
const LOCAL_EVENTS = "orbit:events:v1";
const LOCAL_EVENTS_MAX = 3000;
const pendingKey = (uid: string) => `orbit:pending:${uid}`;
const SNAPSHOT_WINDOW_MS = 10 * 60 * 1000;

function readLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function lampRank(l: Lamp): number {
  return l === "ap" ? 2 : l === "fc" ? 1 : 0;
}
function maxLamp(a: Lamp, b: Lamp): Lamp {
  return lampRank(a) >= lampRank(b) ? a : b;
}
/** Best of two records: higher score, and the better lamp independently (lamps are separate achievements). */
function bestOf(a: ScoreEntry | undefined, b: ScoreEntry): ScoreEntry {
  if (!a) return b;
  return { score: Math.max(a.score, b.score), lamp: maxLamp(a.lamp, b.lamp) };
}
const same = (a: ScoreEntry | undefined, b: ScoreEntry) => !!a && a.score === b.score && a.lamp === b.lamp;

interface ScoreRow {
  chart_id: string;
  score: number;
  lamp: Lamp;
}

/** Queued cloud write: an entry to upsert, or null to delete. */
type Pending = Map<string, ScoreEntry | null>;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState<DataVersion | null>(null);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scores, setScores] = useState<ScoreMap>({});
  const [scoresLoading, setScoresLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [events, setEvents] = useState<ScoreEvent[]>([]);

  const userId = session?.user.id ?? null;
  const pending = useRef<Pending>(new Map());
  const inflight = useRef<Pending>(new Map());
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writesBlocked = useRef(false);

  const toast = useCallback((text: string, tone: "info" | "error" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // charts
  useEffect(() => {
    loadCharts()
      .then(({ version, charts }) => {
        setVersion(version);
        setCharts(charts);
      })
      .catch((e: Error) => setError(tr("loadCharts", { msg: e.message })));
  }, []);

  // auth
  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase()
      .from("profiles")
      .select("user_id, handle, display_name, is_public, show_completion")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase()
      .from("profiles")
      .select("user_id, handle, display_name, is_public, show_completion")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfile((data as Profile) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── cloud write queue ────────────────────────────────────────────────────
  // Queued writes are mirrored to localStorage per user until the server confirms them,
  // so closing the tab or a failed request never loses an edit.
  const persistPending = useCallback(() => {
    if (!userId) return;
    const all = new Map([...inflight.current, ...pending.current]);
    if (all.size) writeLocal(pendingKey(userId), Object.fromEntries(all));
    else {
      try {
        localStorage.removeItem(pendingKey(userId));
      } catch {
        /* ignore */
      }
    }
  }, [userId]);

  const runFlush = useCallback(async (): Promise<boolean> => {
    if (!userId || !pending.current.size) return true;
    const batch: Pending = new Map(pending.current);
    pending.current.clear();
    inflight.current = batch;
    setSyncing(true);
    try {
      const up = [...batch].filter(([, e]) => e).map(([chart_id, e]) => ({ user_id: userId, chart_id, score: e!.score, lamp: e!.lamp }));
      const del = [...batch].filter(([, e]) => !e).map(([id]) => id);
      for (let i = 0; i < up.length; i += 500) {
        const { error } = await supabase().from("scores").upsert(up.slice(i, i + 500), { onConflict: "user_id,chart_id" });
        if (error) throw new Error(error.message);
      }
      if (del.length) {
        const { error } = await supabase().from("scores").delete().eq("user_id", userId).in("chart_id", del);
        if (error) throw new Error(error.message);
      }
      inflight.current = new Map();
      persistPending();
      return true;
    } catch (e) {
      for (const [id, entry] of batch) if (!pending.current.has(id)) pending.current.set(id, entry);
      inflight.current = new Map();
      persistPending();
      toast(tr("saveFailed", { msg: (e as Error).message }), "error");
      return false;
    } finally {
      setSyncing(false);
    }
  }, [userId, persistPending, toast]);

  /** Serialized flush: a later write never races an earlier one. */
  const flush = useCallback((): Promise<boolean> => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    chain.current = chain.current.then(runFlush, runFlush);
    return chain.current;
  }, [runFlush]);

  const enqueue = useCallback(
    (changed: Record<string, ScoreEntry | null>) => {
      for (const [id, e] of Object.entries(changed)) pending.current.set(id, e);
      persistPending();
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => void flush(), 700);
    },
    [persistPending, flush],
  );

  // retry queued writes every 20 s while anything is waiting
  useEffect(() => {
    if (!userId) return;
    const t = setInterval(() => {
      if (pending.current.size && !writesBlocked.current) void flush();
    }, 20_000);
    return () => clearInterval(t);
  }, [userId, flush]);

  // flush when the tab is hidden (the queue is persisted, so this is best effort)
  useEffect(() => {
    const h = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", h);
    window.addEventListener("pagehide", h);
    return () => {
      document.removeEventListener("visibilitychange", h);
      window.removeEventListener("pagehide", h);
    };
  }, [flush]);

  // ── load scores: local, or cloud + local merge + replay of unsent writes ─
  const chartIds = useMemo(() => new Set(charts.map((c) => c.id)), [charts]);
  useEffect(() => {
    if (!authReady || chartIds.size === 0) return;
    let cancelled = false;
    pending.current = new Map();
    inflight.current = new Map();
    (async () => {
      setScoresLoading(true);
      setSyncError(null);
      writesBlocked.current = false;
      const local = readLocal<ScoreMap>(LOCAL_SCORES, {});
      if (!userId) {
        if (!cancelled) {
          setScores(local);
          setEvents(readLocal<ScoreEvent[]>(LOCAL_EVENTS, []));
          setScoresLoading(false);
        }
        return;
      }
      try {
        const rows = await selectAll<ScoreRow>((from, to) =>
          supabase().from("scores").select("chart_id, score, lamp").eq("user_id", userId).order("chart_id").range(from, to),
        );
        const cloud: ScoreMap = {};
        for (const r of rows) cloud[r.chart_id] = { score: r.score, lamp: r.lamp };

        const queued: Record<string, ScoreEntry | null> = {};
        // 1) unsent writes from an earlier visit win (they are newer than what the server has)
        const unsent = readLocal<Record<string, ScoreEntry | null>>(pendingKey(userId), {});
        for (const [id, e] of Object.entries(unsent)) {
          if (!chartIds.has(id)) continue;
          if (e) cloud[id] = e;
          else delete cloud[id];
          queued[id] = e;
        }
        // 2) scores entered before signing in are merged as "best of"
        let moved = 0;
        for (const [id, e] of Object.entries(local)) {
          if (!chartIds.has(id)) continue;
          const merged = bestOf(cloud[id], e);
          if (!same(cloud[id], merged)) {
            cloud[id] = merged;
            queued[id] = merged;
            moved++;
          }
        }
        if (cancelled) return;
        setScores(cloud);
        if (Object.keys(queued).length) {
          for (const [id, e] of Object.entries(queued)) pending.current.set(id, e);
          persistPending();
          const ok = await flush();
          if (ok && moved) toast(tr("moved", { n: moved }));
        }
        if (Object.keys(local).length) {
          writeLocal(LOCAL_SCORES, {});
          writeLocal(LOCAL_EVENTS, []); // the server trigger logs the moved scores
        }
        const ev = await supabase().from("score_events").select(EVENT_COLS).eq("user_id", userId).order("created_at", { ascending: false }).limit(300);
        if (!cancelled && !ev.error) setEvents((ev.data as EventRow[]).map(toEvent));
      } catch (e) {
        if (!cancelled) {
          writesBlocked.current = true;
          setSyncError(tr("loadScores", { msg: (e as Error).message }));
        }
      } finally {
        if (!cancelled) setScoresLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, userId, chartIds, flush, persistPending, toast]);

  const blocked = useCallback(() => {
    if (!writesBlocked.current) return false;
    toast(tr("blocked"), "error");
    return true;
  }, [toast]);

  const logEvents = useCallback(
    (prev: ScoreMap, changed: Record<string, ScoreEntry | null>) => {
      const fresh = diffEvents(prev, changed, new Date().toISOString());
      if (!fresh.length) return;
      setEvents((cur) => {
        const add = fresh.filter((e) => !cur.slice(0, fresh.length).some((c) => sameEvent(c, e)));
        if (!add.length) return cur;
        const all = [...add.reverse(), ...cur].slice(0, userId ? 500 : LOCAL_EVENTS_MAX);
        if (!userId) writeLocal(LOCAL_EVENTS, all);
        return all;
      });
    },
    [userId],
  );

  const commit = useCallback(
    (prev: ScoreMap, next: ScoreMap, changed: Record<string, ScoreEntry | null>) => {
      if (userId) enqueue(changed);
      else writeLocal(LOCAL_SCORES, next);
      logEvents(prev, changed);
    },
    [userId, enqueue, logEvents],
  );

  const setScore = useCallback(
    (chartId: string, entry: ScoreEntry | null) => {
      if (blocked()) return;
      setScores((prev) => {
        const next = { ...prev };
        if (entry) next[chartId] = entry;
        else delete next[chartId];
        commit(prev, next, { [chartId]: entry });
        return next;
      });
    },
    [commit, blocked],
  );

  const setScoreValue = useCallback(
    (chartId: string, score: number | null) => {
      if (blocked()) return;
      setScores((prev) => {
        const next = { ...prev };
        let entry: ScoreEntry | null = null;
        if (score === null) delete next[chartId];
        else {
          entry = { score, lamp: score >= 1_010_000 ? "ap" : prev[chartId]?.lamp ?? "none" };
          next[chartId] = entry;
        }
        commit(prev, next, { [chartId]: entry });
        return next;
      });
    },
    [commit, blocked],
  );

  const setLamp = useCallback(
    (chartId: string, lamp: Lamp) => {
      if (blocked()) return;
      setScores((prev) => {
        const cur = prev[chartId];
        if (!cur) return prev;
        const entry = { ...cur, lamp };
        const next = { ...prev, [chartId]: entry };
        commit(prev, next, { [chartId]: entry });
        return next;
      });
    },
    [commit, blocked],
  );

  const scoresRef = useRef(scores);
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  const applyScores = useCallback(
    async (incoming: ScoreMap, mode: "max" | "overwrite"): Promise<ApplyResult> => {
      if (blocked()) return { changed: 0, saved: false };
      const base = scoresRef.current;
      const next = { ...base };
      const changed: Record<string, ScoreEntry> = {};
      for (const [id, e] of Object.entries(incoming)) {
        if (!chartIds.has(id)) continue;
        const merged = mode === "max" ? bestOf(base[id], e) : e;
        if (!same(base[id], merged)) {
          next[id] = merged;
          changed[id] = merged;
        }
      }
      const n = Object.keys(changed).length;
      if (!n) return { changed: 0, saved: true };
      scoresRef.current = next;
      setScores(next);
      commit(base, next, changed);
      const saved = userId ? await flush() : true;
      return { changed: n, saved };
    },
    [commit, flush, userId, chartIds, blocked],
  );

  const clearScores = useCallback(async () => {
    if (blocked()) return;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    pending.current.clear();
    if (userId) {
      await chain.current;
      const { error } = await supabase().from("scores").delete().eq("user_id", userId);
      if (error) {
        toast(tr("deleteFailed", { msg: error.message }), "error");
        return;
      }
      await supabase().from("score_events").delete().eq("user_id", userId);
      persistPending();
    } else {
      writeLocal(LOCAL_SCORES, {});
      writeLocal(LOCAL_EVENTS, []);
    }
    setScores({});
    setEvents([]);
    toast(tr("deleted"));
  }, [userId, toast, persistPending, blocked]);

  const signOut = useCallback(async () => {
    await flush();
    await supabase().auth.signOut();
    toast(tr("signedOut"));
  }, [flush, toast]);

  const index = useMemo(() => (charts.length ? indexCharts(charts) : null), [charts]);
  const analysis = useMemo(() => (index ? analyze(index, scores) : null), [index, scores]);
  const completion = useMemo(() => (index ? analyzeCompletion(index, scores) : null), [index, scores]);

  // rating history: keep one snapshot per 10-minute window, updated in place while scores change
  useEffect(() => {
    if (!analysis || !completion || !version || scoresLoading || syncError) return;
    const t = setTimeout(async () => {
      const snap = {
        rating: analysis.rating,
        completion: Number(completion.total.toFixed(3)),
        completion_percent: Number(completion.percent.toFixed(5)),
        played: analysis.played,
        best: analysis.best.map((b) => ({ c: b.chart.id, s: b.score, r: b.effective })),
        data_version: version.version,
      };
      if (userId) {
        const { data: last } = await supabase()
          .from("rating_snapshots")
          .select("id, rating, played, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!last && snap.played === 0) return;
        if (last && Number(last.rating) === snap.rating && last.played === snap.played) return;
        if (last && Date.now() - Date.parse(last.created_at) < SNAPSHOT_WINDOW_MS) {
          await supabase().from("rating_snapshots").update(snap).eq("id", last.id);
        } else {
          await supabase().from("rating_snapshots").insert({ ...snap, user_id: userId });
        }
      } else {
        const list = readLocal<Snapshot[]>(LOCAL_SNAPSHOTS, []);
        const last = list[list.length - 1];
        if (!last && snap.played === 0) return;
        if (last && last.rating === snap.rating && last.played === snap.played) return;
        const entry = { rating: snap.rating, completion_percent: snap.completion_percent, played: snap.played, created_at: new Date().toISOString() };
        if (last && Date.now() - Date.parse(last.created_at) < SNAPSHOT_WINDOW_MS) list[list.length - 1] = entry;
        else list.push(entry);
        writeLocal(LOCAL_SNAPSHOTS, list.slice(-300));
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [analysis, completion, version, userId, scoresLoading, syncError]);

  const snapshots = useCallback(async (): Promise<Snapshot[]> => {
    if (!userId) return readLocal<Snapshot[]>(LOCAL_SNAPSHOTS, []);
    const rows = await selectAll<Snapshot>((from, to) =>
      supabase()
        .from("rating_snapshots")
        .select("rating, completion_percent, played, created_at")
        .eq("user_id", userId)
        .order("created_at")
        .range(from, to),
    );
    return rows.map((r) => ({ ...r, rating: Number(r.rating), completion_percent: r.completion_percent === null ? null : Number(r.completion_percent) }));
  }, [userId]);

  const chartEvents = useCallback(
    async (ids: string[]): Promise<ScoreEvent[]> => {
      const want = new Set(ids);
      const known = events.filter((e) => want.has(e.chartId));
      if (!userId || !ids.length) return known;
      const { data, error } = await supabase()
        .from("score_events")
        .select(EVENT_COLS)
        .eq("user_id", userId)
        .in("chart_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return known;
      const remote = (data as EventRow[]).map(toEvent);
      // events logged this session may not be flushed yet
      const extra = known.filter((k) => !remote.some((r) => sameEvent(r, k)));
      return [...extra, ...remote].sort((a, b) => b.at.localeCompare(a.at));
    },
    [userId, events],
  );

  const isAdmin = (session?.user.app_metadata as { role?: string } | undefined)?.role === "admin";

  const value: AppState = {
    ready: !!index && authReady && !scoresLoading,
    error,
    syncError,
    version,
    index,
    charts,
    session,
    profile: userId ? profile : null,
    isAdmin,
    scores,
    scoresLoading,
    syncing,
    analysis,
    completion,
    setScore,
    setScoreValue,
    setLamp,
    applyScores,
    clearScores,
    refreshProfile,
    signOut,
    toast,
    toasts,
    snapshots,
    events,
    chartEvents,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
