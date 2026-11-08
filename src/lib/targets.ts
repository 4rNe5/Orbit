import { createTargetEngine, MAX_SCORE, type ChartIndex } from "@/lib/core/rating";
import type { Chart, RatingAnalysis, ScoreMap } from "@/lib/core/types";

export interface Target {
  chart: Chart;
  current: number | null;
  minScore: number;
  /** Points to add (minScore − current). */
  need: number;
}

/** Every chart that can lift the displayed rating to `thresholdMicro` on its own, easiest first. */
export function computeTargets(index: ChartIndex, scores: ScoreMap, analysis: RatingAnalysis, thresholdMicro?: number): Target[] {
  const eng = createTargetEngine(index, scores, analysis);
  const thr = thresholdMicro ?? eng.nextThreshold;
  // A chart can only matter if its best possible effective rating beats the current 40th.
  const ranked = [...analysis.results].sort((a, b) => a.rank - b.rank);
  const floor40 = ranked[39]?.effective ?? 0;
  const out: Target[] = [];
  for (const c of index.charts) {
    if (c.deleted) continue;
    if (c.constant + 3.6 <= floor40 && analysis.byId[c.id].rank > 40) continue;
    const cur = scores[c.id]?.score ?? null;
    if ((cur ?? 0) >= MAX_SCORE) continue;
    const s = eng.minScore(c.id, thr);
    if (s === null) continue;
    out.push({ chart: c, current: cur, minScore: s, need: s - (cur ?? 0) });
  }
  out.sort((a, b) => a.need - b.need || b.chart.constant - a.chart.constant);
  return out;
}

export interface PlanStep {
  chart: Chart;
  from: number | null;
  to: number;
  ratingAfter: number;
}

/**
 * Greedy plan toward a target rating: repeatedly take the chart that reaches the next 0.001 with
 * the fewest points, apply it, and continue. Not guaranteed optimal; a practical route.
 */
export function planToRating(
  index: ChartIndex,
  scores: ScoreMap,
  analyzeFn: (s: ScoreMap) => RatingAnalysis,
  target: number,
  maxSteps = 60,
): { steps: PlanStep[]; reached: boolean } {
  let cur = { ...scores };
  let a = analyzeFn(cur);
  const steps: PlanStep[] = [];
  for (let i = 0; i < maxSteps && a.rating < target; i++) {
    const t = computeTargets(index, cur, a)[0];
    if (!t) break;
    const prev = steps.findIndex((s) => s.chart.id === t.chart.id);
    cur = { ...cur, [t.chart.id]: { score: t.minScore, lamp: cur[t.chart.id]?.lamp ?? "none" } };
    a = analyzeFn(cur);
    if (prev >= 0) {
      steps[prev] = { ...steps[prev], to: t.minScore, ratingAfter: a.rating };
    } else steps.push({ chart: t.chart, from: scores[t.chart.id]?.score ?? null, to: t.minScore, ratingAfter: a.rating });
  }
  return { steps, reached: a.rating >= target };
}
