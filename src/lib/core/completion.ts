import { excelRound } from "./excel";
import { chartRating, MAX_SCORE, type ChartIndex } from "./rating";
import type { Chart, ScoreMap } from "./types";

/** EX+ bonus by score (sheet column U). */
export function exPlusBonus(score: number): number {
  const m = score;
  if (m < 1_008_000) return 0;
  if (m < 1_009_000) return (m - 1_008_000) * 0.00001;
  if (m < 1_009_250) return 0.01 + (m - 1_009_000) * 0.00002;
  if (m < 1_009_500) return 0.015 + (m - 1_009_250) * 0.00003;
  if (m < 1_009_750) return 0.0225 + (m - 1_009_500) * 0.00004;
  if (m < 1_009_900) return 0.0325 + (m - 1_009_750) * 0.00005;
  return 0.04 + (m - 1_009_900) * 0.0001;
}

const DIFF_FACTOR: Record<string, number> = { I: 0.7, II: 0.8, III: 0.9, IV: 1 };

export interface ChartCompletion {
  chart: Chart;
  /** Score of completion, ROUND(·, 3) (sheet column W). */
  value: number;
  /** Completion point that counts toward the total (sheet column Y). */
  point: number;
  /** Main difficulty used for band grouping (sheet column AR). */
  mainConstant: number;
  /** Whether this chart occupies a slot in band statistics (sheet column AS). */
  counted: boolean;
}

export interface CompletionBand {
  key: string;
  label: string;
  min: number;
  max: number;
  slots: number;
  total: number;
  gap: number;
  share: number;
  gapShare: number;
}

export interface CompletionAnalysis {
  total: number;
  max: number;
  percent: number;
  charts: Record<string, ChartCompletion>;
  bands: CompletionBand[];
}

export const BANDS: { key: string; label: string; min: number; max: number }[] = [
  { key: "lt11", label: "11 미만", min: 0, max: 10.9 },
  { key: "11", label: "11", min: 11, max: 11.5 },
  { key: "11p", label: "11+", min: 11.6, max: 11.9 },
  { key: "12", label: "12", min: 12, max: 12.5 },
  { key: "12p", label: "12+", min: 12.6, max: 12.9 },
  { key: "13", label: "13", min: 13, max: 13.5 },
  { key: "13p", label: "13+", min: 13.6, max: 13.9 },
  { key: "14", label: "14", min: 14, max: 14.5 },
  { key: "x", label: "14.6+", min: 14.6, max: 9999 },
];

export function analyzeCompletion(index: ChartIndex, scores: ScoreMap): CompletionAnalysis {
  const value: Record<string, number> = {};
  for (const c of index.charts) {
    const e = scores[c.id];
    const score = e?.score ?? 0;
    const raw = e ? chartRating(c.constant, score, c.deleted) : 0;
    const basic = (raw / (c.constant + 3.6)) * 0.925;
    if (basic === 0) {
      value[c.id] = 0;
      continue;
    }
    const clear = score >= MAX_SCORE ? 0.025 : e?.lamp === "ap" ? 0.02 : e?.lamp === "fc" ? 0.01 : 0;
    const sum = Math.min(1, basic + exPlusBonus(score) + clear);
    value[c.id] = excelRound(c.difficulty === "IV-α" ? sum : DIFF_FACTOR[c.difficulty] * sum, 3);
  }

  const bySong: Record<string, Chart[]> = {};
  for (const c of index.charts) (bySong[c.songId] ??= []).push(c);

  const out: Record<string, ChartCompletion> = {};
  let total = 0;
  let max = 0;
  for (const [, charts] of Object.entries(bySong)) {
    const regular = charts.filter((c) => c.difficulty !== "IV-α");
    const maxW = Math.max(...regular.map((c) => value[c.id]));
    const maxX = Math.max(...regular.filter((c) => value[c.id] === maxW).map((c) => DIFF_FACTOR[c.difficulty]));
    const ivConstant = charts.find((c) => c.difficulty === "IV")?.constant ?? 0;
    const anyPlayed = charts.some((c) => value[c.id] > 0);
    for (const c of charts) {
      const w = value[c.id];
      const alpha = c.difficulty === "IV-α";
      const point = alpha ? w : w === maxW && DIFF_FACTOR[c.difficulty] === maxX ? w : 0;
      let counted: boolean;
      if (c.deleted) counted = false;
      else if (alpha) counted = true;
      else if (anyPlayed) counted = point > 0;
      else counted = c.difficulty === "IV";
      out[c.id] = { chart: c, value: w, point, mainConstant: alpha ? c.constant : ivConstant, counted };
      total += point;
      if (!c.deleted && (c.difficulty === "IV" || alpha)) max += 1;
    }
  }

  const bands: CompletionBand[] = BANDS.map((b) => {
    const inBand = Object.values(out).filter((x) => x.counted && x.mainConstant >= b.min && x.mainConstant <= b.max);
    const slots = inBand.length;
    const t = inBand.reduce((s, x) => s + x.value, 0);
    return {
      ...b,
      slots,
      total: t,
      gap: slots - t,
      share: t === 0 ? 0 : t / max,
      gapShare: slots - t === 0 ? 0 : (slots - t) / max,
    };
  });

  return { total, max, percent: max ? total / max : 0, charts: out, bands };
}
