"use client";

import type { ChartResult } from "@/lib/core/types";
import { diffClass, fmtScore } from "@/lib/format";
import { cx, LampBadge } from "./ui";

function Row({ r, big, className }: { r: ChartResult; big?: boolean; className?: string }) {
  return (
    <li className={cx(diffClass(r.chart.difficulty), "relative flex items-center gap-3 overflow-hidden px-4", big ? "py-3.5" : "py-2.5", className)}>
      <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full" style={{ background: "var(--diff)" }} aria-hidden />
      <span className={cx("num w-7 shrink-0 text-mist", big ? "text-[15px]" : "text-[13px]")}>{r.rank}</span>
      <div className="min-w-0 flex-1">
        <div className={cx("truncate font-medium", big ? "text-[15px]" : "text-[14px]")} title={r.chart.title}>
          {r.chart.title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-mist">
          <span className="font-semibold" style={{ color: "var(--diff)" }}>
            {r.chart.difficulty}
          </span>
          <span className="num">{r.chart.constant.toFixed(1)}</span>
          <span className="num">{fmtScore(r.score)}</span>
          <LampBadge lamp={r.lamp} apPlus={r.apPlus} />
        </div>
      </div>
      <span className={cx("num shrink-0 font-semibold", big ? "text-[18px]" : "text-[15px]")}>{r.effective.toFixed(4)}</span>
    </li>
  );
}

export function BestList({ best }: { best: ChartResult[] }) {
  const groups = [
    { title: "B1–10", sub: "레이팅의 60%", items: best.slice(0, 10), big: true },
    { title: "B11–20", sub: "20%", items: best.slice(10, 20) },
    { title: "B21–40", sub: "20%", items: best.slice(20, 40) },
  ];
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) =>
        g.items.length ? (
          <section key={g.title}>
            <h2 className="mb-2 flex items-baseline gap-2">
              <span className="font-display text-[17px] font-semibold">{g.title}</span>
              <span className="text-[12px] text-mist">{g.sub}</span>
            </h2>
            <ol className={cx("grid overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper", "divide-y divide-line md:grid-cols-2 md:divide-y-0")}>
              {g.items.map((r, i) => (
                <Row key={r.chart.id} r={r} big={g.big} className={cx("md:border-line", i % 2 === 0 && "md:border-r", i >= 2 && "md:border-t")} />
              ))}
            </ol>
          </section>
        ) : null,
      )}
    </div>
  );
}
