"use client";

import type { ChartResult } from "@/lib/core/types";
import { fmtScore, grade } from "@/lib/format";
import { defineDict, useT } from "@/lib/i18n";
import { Jacket } from "./jacket";
import { cx } from "./ui";
import { useSongDialog } from "./song-dialog";

const T = defineDict({
  ko: { info: "{title} 곡 정보" },
  ja: { info: "{title} の楽曲情報" },
  zh: { info: "{title} 曲目信息" },
});

/** One chart as a jacket tile: art, difficulty frame, rank corner, score + rating on a scrim. */
export function BestTile({ r, rank, eager, big, inert }: { r: ChartResult; rank?: number; eager?: boolean; big?: boolean; inert?: boolean }) {
  const open = useSongDialog();
  const t = useT(T);
  const n = rank ?? r.rank;
  const c = r.chart;
  const lamp = r.apPlus ? null : r.lamp === "ap" ? "AP" : r.lamp === "fc" ? "FC" : null;
  return (
    <div
      className={cx(c.difficulty === "IV-α" ? "diff-IVa" : `diff-${c.difficulty}`, !inert && "group cursor-pointer")}
      {...(inert ? {} : { role: "button", tabIndex: 0, "aria-label": t("info", { title: c.title }), onClick: () => open(c.songId), onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open(c.songId)) })}
    >
      <div className="relative transition-transform duration-200 group-hover:-translate-y-0.5">
        <Jacket songId={c.songId} title={c.songTitle || c.title} difficulty={c.difficulty} rounded="rounded-[8px]" className="w-full" eager={eager} />
        <span className="pointer-events-none absolute inset-0 rounded-[8px]" style={{ boxShadow: "inset 0 0 0 2px var(--diff)" }} aria-hidden />
        <span className={cx("num absolute left-0 top-0 rounded-br-[6px] rounded-tl-[8px] px-1.5 py-0.5 font-bold text-white", big ? "text-[13px]" : "text-[11px]")} style={{ background: "var(--diff)" }}>
          {n}
        </span>
        {r.apPlus && <span className={cx("max-bg absolute right-1.5 top-1.5 rounded-[4px] px-1 py-px font-bold", big ? "text-[11px]" : "text-[9px]")}>AP+</span>}
        {lamp && <span className={cx("absolute right-1.5 top-1.5 rounded-[4px] px-1 py-px font-bold", lamp === "AP" ? "bg-ap text-[#1a1206]" : "bg-fc text-white", big ? "text-[11px]" : "text-[9px]")}>{lamp}</span>}
        <div className="absolute inset-x-0 bottom-0 rounded-b-[8px] bg-gradient-to-t from-black/85 via-black/45 to-transparent px-2 pb-1.5 pt-6">
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
