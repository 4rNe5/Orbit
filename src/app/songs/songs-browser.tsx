"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Jacket } from "@/components/jacket";
import { useSongDialog } from "@/components/song-dialog";
import { cx, PageHeader, Segmented, TextInput } from "@/components/ui";
import { diffClass } from "@/lib/format";
import { defineDict, useLocale, useT } from "@/lib/i18n";
import { groupPacks, packName } from "@/lib/packs";
import { buildSongs, compareVersion, metaFromRows, type SongRow } from "@/lib/songs";

const T = defineDict({
  ko: {
    title: "악곡 정보",
    meta: "{songs}곡 · {charts}채보 · 곡 데이터 {version}",
    search: "제목·아티스트 검색",
    view: "분류",
    byPack: "팩별",
    byVersion: "버전별",
    jump: "바로 가기",
    contents: "목차",
    songs: "{n}곡",
    noResult: "‘{q}’에 맞는 곡이 없어요.",
    deleted: "삭제됨",
    latest: "최신",
    source: "곡 정보·자켓 출처 Rotaeno 위키 · 정수 출처 레이팅 분석표",
  },
  ja: {
    title: "楽曲一覧",
    meta: "{songs}曲 · {charts}譜面 · 楽曲データ {version}",
    search: "曲名・アーティストで検索",
    view: "分類",
    byPack: "パック別",
    byVersion: "バージョン別",
    jump: "移動",
    contents: "目次",
    songs: "{n}曲",
    noResult: "「{q}」に一致する曲はありません。",
    deleted: "削除済み",
    latest: "最新",
    source: "楽曲情報・ジャケットの出典 Rotaeno Wiki · 定数の出典 レート分析表",
  },
  zh: {
    title: "曲目一览",
    meta: "{songs} 首 · {charts} 个谱面 · 曲目数据 {version}",
    search: "搜索曲名或曲师",
    view: "分类",
    byPack: "按曲包",
    byVersion: "按版本",
    jump: "跳转",
    contents: "目录",
    songs: "{n} 首",
    noResult: "没有与“{q}”匹配的曲目。",
    deleted: "已删除",
    latest: "最新",
    source: "曲目信息与曲绘来源：Rotaeno Wiki · 定数来源：Rating 分析表",
  },
});

type View = "pack" | "version";

interface Section {
  id: string;
  label: string;
  /** Packs inside a category; versions have none. */
  parts: { id: string; label: string; rows: SongRow[] }[];
  count: number;
  badge?: string;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKC").replace(/\s+/g, "");

/** "2.14.3" → "2.14" */
const minor = (v: string) => v.split(".").slice(0, 2).join(".") || "?";

export function SongsBrowser({ initial, dataVersion }: { initial: SongRow[]; dataVersion: string }) {
  const { charts, version } = useApp();
  const t = useT(T);
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("pack");
  const dq = norm(useDeferredValue(q));

  // Live charts (DB) once loaded; the bundled list renders first and for crawlers.
  const meta = useMemo(() => metaFromRows(initial), [initial]);
  const rows = useMemo(() => (charts.length ? buildSongs(charts, meta) : initial), [charts, meta, initial]);
  const haystack = useMemo(() => new Map(rows.map((r) => [r.id, norm([r.title, r.artist, r.id, ...r.alt].join(" "))])), [rows]);
  const hits = useMemo(() => (dq ? rows.filter((r) => haystack.get(r.id)!.includes(dq)) : rows), [rows, dq, haystack]);

  const sections = useMemo<Section[]>(() => {
    if (view === "pack") {
      const byPack = new Map<string, SongRow[]>();
      for (const r of hits) byPack.set(r.pack, [...(byPack.get(r.pack) ?? []), r]);
      return groupPacks(byPack.keys(), locale).map((g, i) => {
        const parts = g.packs.map((p, j) => ({ id: `s${i}-${j}`, label: p.label, rows: byPack.get(p.value)! }));
        return { id: `s${i}`, label: g.category, parts, count: parts.reduce((n, p) => n + p.rows.length, 0) };
      });
    }
    const byVer = new Map<string, SongRow[]>();
    for (const r of hits) byVer.set(minor(r.version), [...(byVer.get(minor(r.version)) ?? []), r]);
    const newest = [...new Set(rows.map((r) => minor(r.version)))].sort(compareVersion).at(-1);
    return [...byVer.keys()]
      .sort((a, b) => compareVersion(b, a))
      .map((v, i) => ({
        id: `v${i}`,
        label: `v${v}`,
        parts: [{ id: `v${i}-0`, label: "", rows: byVer.get(v)!.sort((a, b) => compareVersion(a.version, b.version) || a.order - b.order) }],
        count: byVer.get(v)!.length,
        badge: v === newest ? t("latest") : undefined,
      }));
  }, [hits, rows, view, locale, t]);

  const chartCount = rows.reduce((n, r) => n + r.charts.length, 0);
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div>
      <PageHeader
        title={t("title")}
        meta={t("meta", { songs: rows.length.toLocaleString(), charts: chartCount.toLocaleString(), version: version?.version ?? dataVersion })}
      />

      <div className="sticky top-14 z-20 -mx-4 mb-5 flex flex-wrap items-center gap-2 border-b border-line bg-bg px-4 py-3">
        <TextInput
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="min-w-0 flex-1 sm:max-w-xs"
        />
        <Segmented<View>
          label={t("view")}
          value={view}
          onChange={setView}
          options={[
            { value: "pack", label: t("byPack") },
            { value: "version", label: t("byVersion") },
          ]}
        />
        <select
          aria-label={t("jump")}
          value=""
          onChange={(e) => e.target.value && jump(e.target.value)}
          className="h-10 rounded-[8px] border border-line bg-paper px-2 text-[13px] text-ink lg:hidden"
        >
          <option value="">{t("jump")}</option>
          {sections.map((s) =>
            view === "pack" ? (
              <optgroup key={s.id} label={s.label}>
                {s.parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ),
          )}
        </select>
        <span className="num ml-auto text-[13px] text-mist">{t("songs", { n: hits.length.toLocaleString() })}</span>
      </div>

      <div className="lg:grid lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-8">
        <nav aria-label={t("contents")} className="hidden lg:block">
          <div className="sticky top-[8.5rem] max-h-[calc(100dvh-10rem)] overflow-y-auto pb-6 pr-1 text-[13px]">
            <div className="mb-2 font-semibold text-ink-2">{t("contents")}</div>
            <ul className="flex flex-col gap-0.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1 font-medium text-ink hover:bg-orbit-soft">
                    <span className="truncate">{s.label}</span>
                    <span className="num shrink-0 text-[11px] text-mist">{s.count}</span>
                  </a>
                  {view === "pack" && (
                    <ul className="mb-1 ml-2 border-l border-line pl-2">
                      {s.parts.map((p) => (
                        <li key={p.id}>
                          <a href={`#${p.id}`} className="block truncate rounded-md px-2 py-0.5 text-mist hover:bg-orbit-soft hover:text-ink">
                            {p.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="min-w-0">
          {sections.length === 0 && <p className="py-12 text-center text-[14px] text-mist">{t("noResult", { q })}</p>}
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="mb-10 scroll-mt-36">
              <h2 className="mb-3 flex items-baseline gap-2 border-b border-line pb-2">
                <span className="text-[20px] font-bold tracking-[-0.01em]">{s.label}</span>
                {s.badge && <span className="rounded-[4px] bg-orbit-soft px-1.5 py-0.5 text-[11px] font-semibold text-orbit">{s.badge}</span>}
                <span className="num text-[13px] text-mist">{t("songs", { n: s.count })}</span>
              </h2>
              {s.parts.map((p) => (
                <div key={p.id} id={p.id} className="mb-6 scroll-mt-36">
                  {p.label && (
                    <h3 className="mb-2.5 flex items-baseline gap-2 text-[15px] font-semibold text-ink-2">
                      {p.label}
                      <span className="num text-[12px] font-normal text-mist">{p.rows.length}</span>
                    </h3>
                  )}
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {p.rows.map((r) => (
                      <li key={r.id}>
                        <SongCard r={r} showPack={view === "version"} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
          <p className="mt-2 text-[12px] text-mist">{t("source")}</p>
        </div>
      </div>
    </div>
  );
}

function SongCard({ r, showPack }: { r: SongRow; showPack: boolean }) {
  const open = useSongDialog();
  const t = useT(T);
  const locale = useLocale();
  return (
    <a
      href={`/song/${encodeURIComponent(r.id)}`}
      onClick={(e) => {
        // plain click opens the sheet; modified clicks keep the real link (new tab, copy)
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        open(r.id);
      }}
      className={cx(
        "flex h-full items-center gap-3 rounded-[8px] border border-line bg-paper p-2 pr-3 transition hover:border-line-strong",
        r.deleted && "opacity-60",
      )}
    >
      <Jacket songId={r.id} title={r.title} rounded="rounded-[5px]" className="w-12" thumb />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold">{r.title}</span>
          {r.deleted && <span className="shrink-0 rounded-[4px] border border-line px-1 text-[10px] text-mist">{t("deleted")}</span>}
        </div>
        <div className="truncate text-[12px] text-mist">
          {r.artist || "—"}
          {showPack && <span className="text-mist/80"> · {packName(r.pack, locale)}</span>}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11.5px]">
          {r.charts.map((c) => (
            <span key={c.d} className={cx(diffClass(c.d), "whitespace-nowrap", c.deleted && "line-through opacity-60")} title={c.deleted ? t("deleted") : undefined}>
              <b className="font-semibold" style={{ color: "var(--diff)" }}>
                {c.d}
              </b>{" "}
              <span className="num text-ink-2">{c.c.toFixed(1)}</span>
            </span>
          ))}
        </div>
      </div>
    </a>
  );
}
