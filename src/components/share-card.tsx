import type { ChartResult } from "@/lib/core/types";
import { nextTier, tierStyle } from "@/lib/tiers";
import { RatingNumber, TierBadge } from "./rating";
import { BestTile } from "./best-tile";
import { OrbitGlyph } from "./ui";
import { defineDict, useT } from "@/lib/i18n";

const T = defineDict({
  ko: {
    avg: "평균",
    avgValue: "{label} 평균 {v}",
    completion: "완성도",
    first: "1위",
    toNext: "다음 +0.001",
    nextEmblem: "다음 휘장",
    nextEmblemValue: "{min}까지 {gap}",
    theoretical: "이론치 {v} · −{gap}",
    breakdown: "레이팅 구성",
    distribution: "B40 레이팅 분포",
    copyright: "자켓 이미지의 저작권은 각 권리자에게 있습니다.",
  },
  ja: {
    avg: "平均",
    avgValue: "{label} 平均 {v}",
    completion: "完成度",
    first: "1位",
    toNext: "次の +0.001",
    nextEmblem: "次のエンブレム",
    nextEmblemValue: "{min}まで {gap}",
    theoretical: "理論値 {v} · −{gap}",
    breakdown: "レートの内訳",
    distribution: "B40 レート分布",
    copyright: "ジャケット画像の著作権は各権利者に帰属します。",
  },
  zh: {
    avg: "平均",
    avgValue: "{label} 平均 {v}",
    completion: "完成度",
    first: "第1名",
    toNext: "下一个 +0.001",
    nextEmblem: "下一徽标",
    nextEmblemValue: "距 {min} 还差 {gap}",
    theoretical: "理论值 {v} · −{gap}",
    breakdown: "Rating 构成",
    distribution: "B40 Rating 分布",
    copyright: "曲绘版权归各权利人所有。",
  },
});

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

/** One bar per B40 slot, under the tiles; each bracket gets its dashed average. */
function RatingChart({ best, gs, width }: { best: ChartResult[]; gs: Group[]; width: number }) {
  const t = useT(T);
  const vals = best.map((b) => b.effective);
  const hi = Math.max(...vals);
  const lo = Math.min(...vals);
  const span = Math.max(hi - lo, 0.2);
  const min = lo - span * 0.25;
  const max = hi + span * 0.12;
  const W = width;
  const H = 168;
  const pad = { l: 46, r: 6, t: 24, b: 20 };
  const bw = (W - pad.l - pad.r) / 40;
  const Y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  // one colour, fading with the bracket weight (60% / 20% / 20%)
  const tint = [1, 0.55, 0.32];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block">
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
              <rect key={r.chart.id} x={x0 + i * bw + 2} y={Y(r.effective)} width={bw - 4} height={H - pad.b - Y(r.effective)} rx="2" fill="var(--accent)" fillOpacity={tint[gi]} />
            ))}
            {g.items.length > 0 && (
              <>
                <line x1={x0 + 2} x2={x1 - 2} y1={Y(g.avg)} y2={Y(g.avg)} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 3" />
                <text x={x0 + 4} y={Math.max(12, Y(g.items[0].effective) - 7)} fontSize="12" fontWeight="700" fill="var(--ink)">
                  {t("avgValue", { label: g.label, v: g.avg.toFixed(4) })}
                </text>
              </>
            )}
            <text x={(x0 + x1) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--mist)">
              {g.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] text-mist">{label}</div>
      <div className="num mt-0.5 truncate text-[18px] font-semibold">{value}</div>
    </div>
  );
}

const CARD_W = 1920;
const SIDE_W = 400;
const PAD = 40;
const GAP = 40;
const MAIN_W = CARD_W - PAD * 2 - SIDE_W - GAP;

/**
 * B40 share image, 1920px wide and landscape: player and rating on the left,
 * the 40 charts as four rows of ten (one bracket per row) and their distribution on the right.
 */
export function ShareCard({
  best,
  rating,
  completion,
  name,
  version,
  date,
  toNext,
  theoretical,
}: {
  best: ChartResult[];
  rating: number;
  completion: number;
  name: string;
  version: string;
  date: string;
  toNext: number;
  theoretical: number | null;
}) {
  const t = useT(T);
  const gs = groups(best);
  const apPlus = best.filter((b) => b.apPlus).length;
  const nt = nextTier(rating);
  return (
    <div data-theme="dark" style={{ width: CARD_W, padding: PAD, gap: GAP }} className="relative flex overflow-hidden bg-bg font-sans text-ink">
      <div className="tier-glow pointer-events-none absolute -left-40 -top-48 h-[560px] w-[560px] rounded-full opacity-20 blur-3xl" style={tierStyle(rating)} />

      {/* player */}
      <aside style={{ width: SIDE_W }} className="relative flex shrink-0 flex-col">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-ink-2">
          <OrbitGlyph size={22} />
          Orbit Rating
          <span className="font-normal text-mist">· Rotaeno {version}</span>
        </div>
        <div className="mt-6 truncate text-[34px] font-bold leading-tight tracking-tight">{name}</div>

        <div className="mt-5 text-[13px] text-mist">Rating</div>
        <div className="mt-1 flex items-center gap-3">
          <TierBadge rating={rating} size={64} />
          <RatingNumber rating={rating} className="text-[72px] font-bold leading-none tracking-[-0.03em]" />
        </div>
        {theoretical !== null && <div className="num mt-2 text-[13px] text-mist">{t("theoretical", { v: theoretical.toFixed(3), gap: Math.max(0, theoretical - rating).toFixed(3) })}</div>}

        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 rounded-[14px] border border-line bg-paper px-5 py-4">
          <Fact label={t("completion")} value={`${(completion * 100).toFixed(2)}%`} />
          <Fact label="B40 AP+" value={apPlus} />
          <Fact label={t("first")} value={best[0]?.effective.toFixed(3) ?? "–"} />
          <Fact label={t("toNext")} value={toNext.toFixed(6)} />
          {nt && (
            <div className="col-span-2">
              <Fact label={t("nextEmblem")} value={t("nextEmblemValue", { min: nt.min.toFixed(3), gap: (nt.min - rating).toFixed(3) })} />
            </div>
          )}
        </div>

        <div className="mt-4 rounded-[14px] border border-line bg-paper px-5 py-4">
          <div className="mb-2 text-[12px] text-mist">{t("breakdown")}</div>
          <table className="num w-full text-[14px]">
            <tbody>
              {gs.map((g) => (
                <tr key={g.key}>
                  <td className="py-1 font-semibold text-ink-2">{g.label}</td>
                  <td className="py-1 text-right text-mist">
                    {g.avg.toFixed(4)} × {g.w}
                  </td>
                  <td className="py-1 text-right font-semibold">+{(g.avg * g.w).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-auto pt-6 text-[12px] leading-relaxed text-mist">
          <div className="font-semibold text-ink-2">orbit-rating.vercel.app</div>
          <div>{t("copyright")}</div>
          <div className="num">{date}</div>
        </div>
      </aside>

      {/* charts */}
      <main style={{ width: MAIN_W }} className="relative min-w-0">
        {gs.map((g) =>
          g.items.length ? (
            <section key={g.key} className="mb-4">
              <h2 className="mb-2 flex items-baseline gap-2">
                <span className="text-[17px] font-bold">{g.label}</span>
                <span className="num text-[12px] text-mist">
                  ×{g.w} · {t("avg")} {g.avg.toFixed(4)}
                </span>
              </h2>
              <div className="grid grid-cols-10 gap-x-2.5 gap-y-3">
                {g.items.map((r, i) => (
                  <BestTile key={r.chart.id} r={r} rank={g.from + i + 1} eager inert />
                ))}
              </div>
            </section>
          ) : null,
        )}
        <section className="mt-2 rounded-[14px] border border-line bg-paper px-4 pb-1 pt-3">
          <div className="mb-1 px-1 text-[13px] font-semibold">{t("distribution")}</div>
          <RatingChart best={best} gs={gs} width={MAIN_W - 34} />
        </section>
      </main>
    </div>
  );
}
