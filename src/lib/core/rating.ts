import { excelRound, toUnits4 } from "./excel";
import type { Chart, ChartResult, RatingAnalysis, ScoreMap } from "./types";

export const MAX_SCORE = 1_010_000;

/**
 * Single-chart rating, identical to sheet column P (Rotaeno 2.27.0 rules).
 * A clear lamp never affects rating. Deleted charts are always 0.
 */
export function chartRating(constant: number, score: number, deleted = false): number {
  const c = constant;
  const s = score;
  if (deleted) return 0;
  if (s < 500_000) return Math.max(c - 9999 + s * (4997 / 250000), 0);
  if (s < 900_000) return c - 5 + (s - 500_000) / 100_000;
  if (s < 950_000) return c - 1 + (s - 900_000) / 50_000;
  if (s < 980_000) return c + (s - 950_000) / 30_000;
  if (s < 1_000_000) return c + 1 + (s - 980_000) / 20_000;
  if (s < 1_004_000) return c + 2 + (s - 1_000_000) / 10_000;
  if (s < 1_008_000) return c + 2.4 + (s - 1_004_000) / 4_000;
  return c + 3.4 + (Math.min(s, MAX_SCORE) - 1_008_000) / 10_000;
}

/** Weighted best-40 total in units of 1e-6 from effective ratings in units of 1e-4 (sorted desc). */
function weightedMicro(sortedUnits: number[]): number {
  let t = 0;
  const n = Math.min(40, sortedUnits.length);
  for (let i = 0; i < n; i++) t += sortedUnits[i] * (i < 10 ? 6 : i < 20 ? 2 : 1);
  return t;
}

export function displayRating(totalMicro: number): number {
  return Math.floor(totalMicro / 1000) / 1000;
}

export interface ChartIndex {
  charts: Chart[];
  byId: Record<string, Chart>;
  /** IV ↔ IV-α partner chart id, when the song has both. */
  partner: Record<string, string>;
}

export function indexCharts(charts: Chart[]): ChartIndex {
  const byId: Record<string, Chart> = {};
  for (const c of charts) byId[c.id] = c;
  const partner: Record<string, string> = {};
  for (const c of charts) {
    if (c.difficulty === "IV-α") {
      const iv = `${c.songId}:IV`;
      if (byId[iv]) {
        partner[c.id] = iv;
        partner[iv] = c.id;
      }
    }
  }
  const sorted = [...charts].sort((a, b) => a.defaultOrder - b.defaultOrder);
  return { charts: sorted, byId, partner };
}

/** Sheet column R: IV and IV-α of the same song never both count (a tie keeps IV-α). */
function effectiveRaw(chart: Chart, raw: number, partnerRaw: number | undefined): number {
  if (partnerRaw === undefined) return raw;
  if (chart.difficulty === "IV") return raw <= partnerRaw ? 0 : raw;
  if (chart.difficulty === "IV-α") return raw >= partnerRaw ? raw : 0;
  return raw;
}

export function analyze(index: ChartIndex, scores: ScoreMap): RatingAnalysis {
  const raws: Record<string, number> = {};
  for (const c of index.charts) {
    const e = scores[c.id];
    raws[c.id] = e ? chartRating(c.constant, e.score, c.deleted) : 0;
  }

  const results: ChartResult[] = index.charts.map((c) => {
    const e = scores[c.id];
    const raw = raws[c.id];
    const p = index.partner[c.id];
    const eff = effectiveRaw(c, raw, p ? raws[p] : undefined);
    return {
      chart: c,
      score: e ? e.score : null,
      lamp: e ? e.lamp : "none",
      apPlus: !!e && e.score >= MAX_SCORE,
      raw,
      rating: excelRound(raw, 4),
      effective: excelRound(eff, 4),
      excluded: !!p && eff === 0 && raw > 0,
      rank: 0,
    };
  });

  // RANK by effective desc; ties keep sheet row order (default order).
  const ranked = [...results].sort((a, b) => b.effective - a.effective || a.chart.defaultOrder - b.chart.defaultOrder);
  ranked.forEach((r, i) => (r.rank = i + 1));

  const units = ranked.slice(0, 40).map((r) => toUnits4(r.effective));
  const totalMicro = weightedMicro(units);
  const rating = displayRating(totalMicro);

  const top40 = ranked.slice(0, 40);
  const best = top40.filter((r) => r.score !== null && r.effective > 0);
  const played = results.filter((r) => r.score !== null).length;

  const allTheoretical = top40.every((r) => r.score === MAX_SCORE);
  const toNext = allTheoretical ? 0 : (Math.floor(totalMicro / 1000) + 1) * 1000 - totalMicro;

  const pivot = (n: number) => (ranked[n - 1] && ranked[n - 1].score !== null ? ranked[n - 1].rating : null);
  const sumScores = (a: number, b: number) => ranked.slice(a, b).reduce((s, r) => s + (r.score ?? 0), 0);
  const firstScore = (i: number) => ranked[i]?.score ?? 0;

  let minConstantForBest: number | null = null;
  const r40 = ranked[39];
  if (r40 && r40.score !== null) {
    const u = toUnits4(r40.rating) - 36000; // G52 - 3.6, in 1e-4
    if (u < 0) minConstantForBest = 1;
    else {
      const ceil = Math.ceil(u / 1000) * 1000;
      minConstantForBest = (ceil === u ? ceil + 1000 : ceil) / 10000;
    }
  }

  const byId: Record<string, ChartResult> = {};
  for (const r of results) byId[r.chart.id] = r;

  return {
    rating,
    totalMicro,
    results,
    byId,
    best,
    played,
    toNext: toNext / 1e6,
    pivots: { r1: pivot(1), r10: pivot(10), r20: pivot(20), r40: pivot(40) },
    distance: {
      b10: firstScore(0) ? 10_100_000 - sumScores(0, 10) : null,
      b20: firstScore(10) ? 10_100_000 - sumScores(10, 20) : null,
      b40: firstScore(20) ? 20_200_000 - sumScores(20, 40) : null,
    },
    apPlusInBest: top40.filter((r) => r.score === MAX_SCORE).length,
    minConstantForBest,
  };
}

/** Theoretical maximum rating: every non-deleted chart at 1,010,000. */
export function theoreticalRating(index: ChartIndex): number {
  const scores: ScoreMap = {};
  for (const c of index.charts) if (!c.deleted) scores[c.id] = { score: MAX_SCORE, lamp: "ap" };
  return analyze(index, scores).rating;
}

export interface TargetEngine {
  /** Lowest score on `chartId` that lifts the weighted total to at least `thresholdMicro`; null when impossible. */
  minScore(chartId: string, thresholdMicro?: number): number | null;
  /** Total (1e-6 units) if `chartId` had `score`. */
  totalWith(chartId: string, score: number): number;
  nextThreshold: number;
}

export function createTargetEngine(index: ChartIndex, scores: ScoreMap, analysis: RatingAnalysis): TargetEngine {
  const K = 43;
  const ranked = [...analysis.results].sort((a, b) => a.rank - b.rank);
  const prefix = ranked.slice(0, K).map((r) => ({ id: r.chart.id, u: toUnits4(r.effective) }));
  const rawOf = (id: string) => analysis.byId[id].raw;

  const totalWith = (chartId: string, score: number): number => {
    const chart = index.byId[chartId];
    const newRaw = chartRating(chart.constant, score, chart.deleted);
    const p = index.partner[chartId];
    const group: { id: string; u: number }[] = [
      { id: chartId, u: toUnits4(excelRound(effectiveRaw(chart, newRaw, p ? rawOf(p) : undefined), 4)) },
    ];
    if (p) {
      const pc = index.byId[p];
      group.push({ id: p, u: toUnits4(excelRound(effectiveRaw(pc, rawOf(p), newRaw), 4)) });
    }
    const list: number[] = [];
    for (const e of prefix) if (e.id !== chartId && e.id !== p) list.push(e.u);
    for (const g of group) list.push(g.u);
    list.sort((a, b) => b - a);
    return weightedMicro(list);
  };

  const nextThreshold = (Math.floor(analysis.totalMicro / 1000) + 1) * 1000;

  const minScore = (chartId: string, thresholdMicro = nextThreshold): number | null => {
    const chart = index.byId[chartId];
    if (!chart || chart.deleted) return null;
    const current = scores[chartId]?.score ?? 0;
    if (current >= MAX_SCORE) return null;
    if (totalWith(chartId, MAX_SCORE) < thresholdMicro) return null;
    let lo = current + 1;
    let hi = MAX_SCORE;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (totalWith(chartId, mid) >= thresholdMicro) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };

  return { minScore, totalWith, nextThreshold };
}
