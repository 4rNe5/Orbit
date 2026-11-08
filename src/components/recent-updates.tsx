"use client";

import { useMemo } from "react";
import { fmtScore } from "@/lib/format";
import { useApp, type ScoreEvent } from "./app-provider";
import { Jacket } from "./jacket";
import { SongButton } from "./song-dialog";
import { DiffMark } from "./ui";

type Item = { kind: "one"; e: ScoreEvent } | { kind: "batch"; at: string; count: number; improved: number };

const when = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}시간 전`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

/** Latest score improvements; bulk imports (same timestamp, 6+ rows) fold into one line. */
export function RecentUpdates({ limit = 6 }: { limit?: number }) {
  const { events, index } = useApp();
  const items = useMemo(() => {
    const out: Item[] = [];
    const bySecond = new Map<string, number>();
    for (const e of events) bySecond.set(e.at.slice(0, 19), (bySecond.get(e.at.slice(0, 19)) ?? 0) + 1);
    const folded = new Set<string>();
    for (const e of events) {
      const k = e.at.slice(0, 19);
      const n = bySecond.get(k) ?? 1;
      if (n >= 6) {
        if (folded.has(k)) continue;
        folded.add(k);
        const group = events.filter((x) => x.at.slice(0, 19) === k);
        out.push({ kind: "batch", at: e.at, count: n, improved: group.filter((x) => x.prevScore !== null && x.score > x.prevScore).length });
      } else out.push({ kind: "one", e });
      if (out.length >= limit) break;
    }
    return out;
  }, [events, limit]);

  if (!index || !items.length) return null;
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper/70">
      {items.map((it, i) => {
        if (it.kind === "batch")
          return (
            <li key={`b${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] sm:px-4">
              <span className="text-ink-2">
                한 번에 <b className="num font-semibold text-ink">{it.count.toLocaleString()}</b>개 채보 반영
                {it.improved > 0 && <span className="text-mist"> (갱신 {it.improved})</span>}
              </span>
              <span className="shrink-0 text-[12px] text-mist">{when(it.at)}</span>
            </li>
          );
        const c = index.byId[it.e.chartId];
        if (!c) return null;
        const delta = it.e.prevScore !== null ? it.e.score - it.e.prevScore : null;
        return (
          <li key={`${it.e.at}-${it.e.chartId}`}>
            <SongButton songId={c.songId} label={c.title} className="group flex w-full items-center gap-3 px-3 py-2 sm:px-4">
              <Jacket songId={c.songId} title={c.songTitle || c.title} difficulty={c.difficulty} rounded="rounded-lg" className="w-10" thumb />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium group-hover:text-accent">{c.title}</div>
                <DiffMark d={c.difficulty} constant={c.constant} />
              </div>
              <div className="text-right">
                <div className="num text-[14px] font-semibold">{fmtScore(it.e.score)}</div>
                <div className="num text-[12px] text-mist">
                  {delta !== null && delta > 0 ? <span className="text-good">+{delta.toLocaleString()}</span> : delta === null ? "첫 기록" : it.e.lamp.toUpperCase()}
                  <span> · {when(it.e.at)}</span>
                </div>
              </div>
            </SongButton>
          </li>
        );
      })}
    </ol>
  );
}
