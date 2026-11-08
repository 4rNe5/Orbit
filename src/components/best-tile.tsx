"use client";

import type { ChartResult } from "@/lib/core/types";
import { fmtScore, grade } from "@/lib/format";
import { Jacket } from "./jacket";
import { cx } from "./ui";
import { useSongDialog } from "./song-dialog";

/** One chart as a jacket tile: art, difficulty frame, rank corner, score + rating on a scrim. */
export function BestTile({ r, rank, eager, big, inert }: { r: ChartResult; rank?: number; eager?: boolean; big?: boolean; inert?: boolean }) {
  const open = useSongDialog();
  const n = rank ?? r.rank;
  const c = r.chart;
  const lamp = r.apPlus ? null : r.lamp === "ap" ? "AP" : r.lamp === "fc" ? "FC" : null;
  return (
    <div
      className={cx(c.difficulty === "IV-α" ? "diff-IVa" : `diff-${c.difficulty}`, !inert && "group cursor-pointer")}
      {...(inert ? {} : { role: "button", tabIndex: 0, "aria-label": `${c.title} 곡 정보`, onClick: () => open(c.songId), onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open(c.songId)) })}
    >
      <div className="relative transition-transform duration-200 group-hover:-translate-y-0.5">
        <Jacket songId={c.songId} title={c.songTitle || c.title} difficulty={c.difficulty} rounded="rounded-[12px]" className="w-full" eager={eager} />
        <span className="pointer-events-none absolute inset-0 rounded-[12px]" style={{ boxShadow: "inset 0 0 0 2.5px var(--diff)" }} aria-hidden />
        <span className={cx("num absolute left-0 top-0 rounded-br-[10px] rounded-tl-[12px] px-1.5 py-0.5 font-bold text-white", big ? "text-[13px]" : "text-[11px]")} style={{ background: "var(--diff)" }}>
          {n}
        </span>
        {r.apPlus && <span className={cx("ap-bg absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 font-bold", big ? "text-[11px]" : "text-[9px]")}>AP+</span>}
        {lamp && <span className={cx("absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 font-bold text-black/80", lamp === "AP" ? "bg-ap" : "bg-fc", big ? "text-[11px]" : "text-[9px]")}>{lamp}</span>}
        <div className="absolute inset-x-0 bottom-0 rounded-b-[12px] bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-1.5 pt-6">
          <div className={cx("num leading-tight text-white/80", big ? "text-[13px]" : "text-[11px]")}>{fmtScore(r.score)}</div>
          <div className="flex items-baseline justify-between">
            <span className={cx("num font-bold leading-none text-white", big ? "text-[21px]" : "text-[16px]")}>{r.effective.toFixed(3)}</span>
            <span className={cx("font-semibold text-white/70", big ? "text-[11px]" : "text-[9px]")}>{r.score !== null ? grade(r.score) : ""}</span>
          </div>
        </div>
      </div>
      <div className={cx("mt-1.5 truncate font-medium text-ink", big ? "text-[14px]" : "text-[12px]")} title={c.title}>
        {c.title}
      </div>
      <div className={cx("truncate text-mist", big ? "text-[12px]" : "text-[11px]")}>
        <span className="font-semibold" style={{ color: "var(--diff)" }}>
          {c.difficulty}
        </span>{" "}
        {c.constant.toFixed(1)}
      </div>
    </div>
  );
}
