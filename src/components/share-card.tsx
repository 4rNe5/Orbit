import type { ChartResult } from "@/lib/core/types";
import { BestTile } from "./best-tile";
import { OrbitGlyph } from "./ui";

/** Orbit's rating = avg(B1–10)×0.6 + avg(B11–20)×0.2 + avg(B21–40)×0.2 (empty slots count as 0). */
const GROUPS = [
  { key: "b10", label: "B1–10", from: 0, to: 10, w: 0.6 },
  { key: "b20", label: "B11–20", from: 10, to: 20, w: 0.2 },
  { key: "b40", label: "B21–40", from: 20, to: 40, w: 0.2 },
] as const;

type Group = (typeof GROUPS)[number] & { items: ChartResult[]; avg: number };

function groups(best: ChartResult[]): Group[] {
  return GROUPS.map((g) => {
    const items = best.slice(g.from, g.to);
    const avg = items.reduce((s, r) => s + r.effective, 0) / (g.to - g.from);
    return { ...g, items, avg };
  });
}

/** Bars for all 40 slots; each bracket gets its own dashed average segment. */
function RatingChart({ best, gs }: { best: ChartResult[]; gs: Group[] }) {
  const vals = best.map((b) => b.effective);
  const hi = Math.max(...vals);
  const lo = Math.min(...vals);
  const span = Math.max(hi - lo, 0.2);
  const min = lo - span * 0.2;
  const max = hi + span * 0.08;
  const W = 1216;
  const H = 200;
  const pad = { l: 48, r: 8, t: 30, b: 22 };
  const bw = (W - pad.l - pad.r) / 40;
  const Y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  const tint = ["var(--accent)", "var(--accent-2)", "var(--fc)"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
          <text x={pad.l - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--mist)">
            {v.toFixed(2)}
          </text>
        </g>
      ))}
      {gs.map((g, gi) => {
        const x0 = pad.l + g.from * bw;
        const x1 = pad.l + g.to * bw;
        return (
          <g key={g.key}>
            {g.items.map((r, i) => (
              <rect
                key={r.chart.id}
                x={x0 + i * bw + 2}
                y={Y(r.effective)}
                width={bw - 4}
                height={H - pad.b - Y(r.effective)}
                rx="2"
                fill={tint[gi]}
                fillOpacity={0.85}
              />
            ))}
            {g.items.length > 0 && (
              <>
                <line x1={x0 + 2} x2={x1 - 2} y1={Y(g.avg)} y2={Y(g.avg)} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 3" />
                <text x={x0 + 2} y={Y(g.items[0].effective) - 7} fontSize="11" fontWeight="700" fill="var(--ink)">
                  {g.label} 평균 {g.avg.toFixed(4)}
                </text>
              </>
            )}
            <text x={(x0 + x1) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--mist)">
              {g.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** B40 share image, 1280px wide. Same tiles as the B40 page so the export reads as the site. */
export function ShareCard({
  best,
  rating,
  completion,
  name,
  version,
  date,
}: {
  best: ChartResult[];
  rating: number;
  completion: number;
  name: string;
  version: string;
  date: string;
}) {
  const gs = groups(best);
  const apPlus = best.filter((b) => b.apPlus).length;
  return (
    <div data-theme="dark" style={{ width: 1280 }} className="relative overflow-hidden bg-bg px-8 pb-7 pt-8 font-sans text-ink">
      <div className="pointer-events-none absolute -right-40 -top-48 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl" style={{ background: "var(--grad)" }} />

      {/* header */}
      <header className="relative flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[14px] font-semibold text-ink-2">
            <OrbitGlyph size={22} />
            Orbit Rating
            <span className="font-normal text-mist">· Rotaeno {version}</span>
          </div>
          <div className="mt-3 text-[34px] font-bold leading-none tracking-tight">{name}</div>
          <div className="mt-3 flex gap-5 text-[13px] text-mist">
            <span>
              완성도 <b className="num font-semibold text-ink">{(completion * 100).toFixed(2)}%</b>
            </span>
            <span>
              B40 AP+ <b className="num font-semibold text-ink">{apPlus}</b>
            </span>
            <span>
              1위 <b className="num font-semibold text-ink">{best[0]?.effective.toFixed(3) ?? "–"}</b>
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] text-mist">Rating</div>
          <div className="num grad-text text-[64px] font-bold leading-none tracking-[-0.03em]">{rating.toFixed(3)}</div>
        </div>
      </header>

      {/* how the number is built */}
      <div className="relative mt-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-line bg-paper/60">
        {gs.map((g, i) => (
          <div key={g.key} className={i ? "border-l border-line px-5 py-3" : "px-5 py-3"}>
            <div className="flex items-baseline justify-between text-[12px] text-mist">
              <span>
                <b className="font-semibold text-ink-2">{g.label}</b> 평균 × {g.w}
              </span>
              <span className="num">{g.avg.toFixed(4)}</span>
            </div>
            <div className="num mt-0.5 text-[22px] font-semibold">+{(g.avg * g.w).toFixed(4)}</div>
          </div>
        ))}
      </div>

      {/* tiles */}
      {gs.map((g) =>
        g.items.length ? (
          <section key={g.key} className="relative mt-7">
            <h2 className="mb-3 flex items-baseline gap-2">
              <span className="text-[20px] font-bold">{g.label}</span>
              <span className="text-[13px] text-mist">{g.key === "b10" ? "레이팅의 60%" : "20%"}</span>
            </h2>
            <div className="grid grid-cols-5 gap-x-3.5 gap-y-4">
              {g.items.map((r, i) => (
                <BestTile key={r.chart.id} r={r} rank={g.from + i + 1} eager big inert />
              ))}
            </div>
          </section>
        ) : null,
      )}

      {/* distribution */}
      <section className="relative mt-8 rounded-2xl border border-line bg-paper/60 px-4 pb-2 pt-4">
        <div className="mb-1 px-1 text-[14px] font-semibold">B40 레이팅 분포</div>
        <RatingChart best={best} gs={gs} />
      </section>

      <footer className="relative mt-5 flex items-end justify-between text-[12px] text-mist">
        <div>
          <span className="font-semibold text-ink-2">orbit-rating.vercel.app</span>
          <span className="ml-3">자켓 이미지의 저작권은 각 권리자에게 있습니다.</span>
        </div>
        <span className="num">{date}</span>
      </footer>
    </div>
  );
}
