"use client";

import type { ChartResult } from "@/lib/core/types";
import { diffClass, fmtScore } from "@/lib/format";

const RINGS = [
  { from: 0, count: 10, r: 168, w: 13, cls: "r1" },
  { from: 10, count: 10, r: 136, w: 10, cls: "r2" },
  { from: 20, count: 20, r: 108, w: 8, cls: "r3" },
];

function arc(r: number, a0: number, a1: number) {
  const p = (a: number) => [200 + r * Math.cos(((a - 90) * Math.PI) / 180), 200 + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * The player's best 40 drawn as notes on three orbits, like Rotaeno's ring:
 * outer = ranks 1–10, middle = 11–20, inner = 21–40. Arc fill strength = how close
 * the chart is to its own maximum (constant + 3.6).
 */
export function OrbitChart({
  best,
  rating,
  caption,
  sub,
  size = 400,
}: {
  best: ChartResult[];
  rating: number | null;
  caption: string;
  sub?: string;
  size?: number;
}) {
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} className="block h-auto max-w-full" role="img" aria-label={`${caption} ${rating ?? ""}`}>
      <circle cx="200" cy="200" r="190" fill="none" stroke="var(--line)" strokeDasharray="2 6" />
      {RINGS.map((ring) => {
        const slot = 360 / ring.count;
        return (
          <g key={ring.cls} className={`orbit-ring ${ring.cls}`}>
            <circle cx="200" cy="200" r={ring.r} fill="none" stroke="var(--line)" strokeWidth={ring.w + 6} strokeOpacity="0.55" />
            {Array.from({ length: ring.count }, (_, i) => {
              const res = best[ring.from + i];
              const a0 = i * slot + slot * 0.14;
              const a1 = (i + 1) * slot - slot * 0.14;
              if (!res)
                return <path key={i} d={arc(ring.r, a0, a1)} fill="none" stroke="var(--line-strong)" strokeWidth={2} strokeLinecap="round" strokeDasharray="1 5" />;
              const max = res.chart.constant + 3.6;
              const strength = Math.max(0.32, Math.min(1, (res.effective - (max - 3)) / 3));
              const mid = (a0 + a1) / 2;
              const dot = [200 + (ring.r + ring.w) * Math.cos(((mid - 90) * Math.PI) / 180), 200 + (ring.r + ring.w) * Math.sin(((mid - 90) * Math.PI) / 180)];
              return (
                <g key={i} className={diffClass(res.chart.difficulty)}>
                  <title>{`#${ring.from + i + 1} ${res.chart.title} ${res.chart.difficulty} ${res.chart.constant.toFixed(1)} · ${fmtScore(res.score)} · ${res.effective.toFixed(4)}`}</title>
                  <path d={arc(ring.r, a0, a1)} fill="none" stroke="var(--diff)" strokeOpacity={strength} strokeWidth={ring.w} strokeLinecap="round" />
                  {res.apPlus && <circle cx={dot[0]} cy={dot[1]} r="2.4" fill="var(--orbit)" />}
                </g>
              );
            })}
          </g>
        );
      })}
      <circle cx="200" cy="200" r="78" fill="var(--paper)" stroke="var(--line)" />
      <g className="rise">
        <text x="200" y="186" textAnchor="middle" fontSize="13" fill="var(--mist)" style={{ fontFamily: "var(--font-sans)" }}>
          {caption}
        </text>
        <text x="200" y="224" textAnchor="middle" fontSize="40" fontWeight="600" fill="var(--ink)" className="num" style={{ letterSpacing: "-0.03em" }}>
          {rating === null ? "–" : rating.toFixed(3)}
        </text>
        {sub && (
          <text x="200" y="248" textAnchor="middle" fontSize="11.5" fill="var(--mist)" style={{ fontFamily: "var(--font-sans)" }}>
            {sub}
          </text>
        )}
      </g>
    </svg>
  );
}
