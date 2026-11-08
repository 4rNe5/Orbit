import type { Chart, Difficulty } from "@/lib/core/types";

/** One song for the song index: its charts plus the few wiki facts the list shows and searches. */
export interface SongRow {
  id: string;
  title: string;
  artist: string;
  /** Sheet pack name (Chinese); display names come from lib/packs. */
  pack: string;
  /** Release version of the song (wiki), else the oldest chart version. */
  version: string;
  /** In-game order (smallest chart order). */
  order: number;
  /** Other titles (wiki page title, translations) — searched, not shown. */
  alt: string[];
  charts: { d: Difficulty; c: number; deleted: boolean }[];
  /** Every chart is deleted. */
  deleted: boolean;
}

export type SongMeta = Record<string, { artist: string; version?: string; alt: string[] }>;

const DIFF_ORDER: Difficulty[] = ["I", "II", "III", "IV", "IV-α"];

/** "2.10.0" vs "2.9.1" → numeric compare. */
export function compareVersion(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

export function buildSongs(charts: Chart[], meta: SongMeta): SongRow[] {
  const by = new Map<string, Chart[]>();
  for (const c of charts) {
    const list = by.get(c.songId);
    if (list) list.push(c);
    else by.set(c.songId, [c]);
  }
  const rows: SongRow[] = [];
  for (const [id, list] of by) {
    list.sort((a, b) => DIFF_ORDER.indexOf(a.difficulty) - DIFF_ORDER.indexOf(b.difficulty));
    const main = list.find((c) => c.difficulty === "IV") ?? list[0];
    const m = meta[id];
    const oldest = list.map((c) => c.version).filter(Boolean).sort(compareVersion)[0] ?? "";
    rows.push({
      id,
      title: main.songTitle || main.title,
      artist: m?.artist ?? "",
      pack: main.songPack || main.pack,
      version: m?.version || oldest,
      order: Math.min(...list.map((c) => c.defaultOrder)),
      alt: [...new Set([...(m?.alt ?? []), ...list.map((c) => c.title)])].filter((t) => t !== (main.songTitle || main.title)),
      charts: list.map((c) => ({ d: c.difficulty, c: c.constant, deleted: c.deleted })),
      deleted: list.every((c) => c.deleted),
    });
  }
  return rows.sort((a, b) => a.order - b.order);
}

/** Meta for buildSongs from the wiki song info (src/data/songinfo.json). */
export function metaFromInfo(info: Record<string, { w?: string; a?: string; v?: string; t?: [string, string][] }>): SongMeta {
  const out: SongMeta = {};
  for (const [id, s] of Object.entries(info)) {
    out[id] = { artist: s.a ?? "", version: s.v, alt: [s.w, ...(s.t ?? []).map(([, t]) => t)].filter((x): x is string => !!x) };
  }
  return out;
}

/** The meta a list of rows was built from, so the client can rebuild from live charts without the wiki file. */
export function metaFromRows(rows: SongRow[]): SongMeta {
  const out: SongMeta = {};
  for (const r of rows) out[r.id] = { artist: r.artist, version: r.version, alt: r.alt };
  return out;
}
