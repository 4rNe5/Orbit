import type { ChartIndex } from "@/lib/core/rating";
import type { Chart, RatingAnalysis, ScoreMap } from "@/lib/core/types";
import type { Locale } from "@/lib/i18n";

/** Per-song wiki data the analysis needs: duration (s) and note counts per difficulty. */
export interface NoteInfo {
  d: number;
  c: Record<string, { n?: [total: number, tap: number, flick: number, slide: number, katch: number, rotate: number] }>;
}

export type FeatureKey = "tap" | "flick" | "slide" | "catch" | "rotate" | "density";

/** A UI string in each locale. */
export type Localized = Record<Locale, string>;

const PCT: Localized = { ko: "%", ja: "%", zh: "%" };
/** Notes per second. */
const PER_SEC: Localized = { ko: "개/초", ja: "個/秒", zh: "个/秒" };

export const FEATURES: { key: FeatureKey; label: Localized; unit: Localized }[] = [
  { key: "tap", label: { ko: "Tap 비중", ja: "Tap 比率", zh: "Tap 占比" }, unit: PCT },
  { key: "flick", label: { ko: "Flick 비중", ja: "Flick 比率", zh: "Flick 占比" }, unit: PCT },
  { key: "slide", label: { ko: "Slide 비중", ja: "Slide 比率", zh: "Slide 占比" }, unit: PCT },
  { key: "catch", label: { ko: "Catch 비중", ja: "Catch 比率", zh: "Catch 占比" }, unit: PCT },
  { key: "rotate", label: { ko: "Rotate 비중", ja: "Rotate 比率", zh: "Rotate 占比" }, unit: PCT },
  { key: "density", label: { ko: "노트 밀도", ja: "ノーツ密度", zh: "音符密度" }, unit: PER_SEC },
];

export interface Sample {
  chart: Chart;
  score: number;
  expected: number;
  /** score − expected (clipped to ±30,000 so a single abandoned run can't dominate). */
  residual: number;
  f: Record<FeatureKey, number>;
}

export interface FeatureResult {
  key: FeatureKey;
  label: Localized;
  unit: Localized;
  /** Mean residual of the top third minus the bottom third (points). Negative = weaker on charts heavy in this. */
  diff: number;
  /** Welch t statistic of that difference. |t| < 2 → weak evidence. */
  t: number;
  /** Feature value at the top-third boundary, for the explanation. */
  cut: number;
  n: number;
}

export interface Insights {
  /** Charts that qualified (may be fewer than MIN_SAMPLES; then nothing else is filled). */
  count: number;
  samples: Sample[];
  minConstant: number;
  features: FeatureResult[];
  /** Fitted expected score at constant c. */
  expectedAt: (c: number) => number;
}

export const MIN_SAMPLES = 30;
const CLIP = 30_000;

/** Huber-weighted linear fit y = a + b·x (a few IRLS rounds; robust to the odd bad run). */
function robustLine(x: number[], y: number[]): [number, number] {
  let w = x.map(() => 1);
  let a = 0;
  let b = 0;
  for (let it = 0; it < 8; it++) {
    let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < x.length; i++) {
      sw += w[i];
      sx += w[i] * x[i];
      sy += w[i] * y[i];
      sxx += w[i] * x[i] * x[i];
      sxy += w[i] * x[i] * y[i];
    }
    const den = sw * sxx - sx * sx;
    b = den ? (sw * sxy - sx * sy) / den : 0;
    a = (sy - b * sx) / sw;
    const res = x.map((xi, i) => y[i] - (a + b * xi));
    const mad = median(res.map(Math.abs)) || 1;
    const k = 1.345 * 1.4826 * mad;
    w = res.map((r) => (Math.abs(r) <= k ? 1 : k / Math.abs(r)));
  }
  return [a, b];
}

function median(v: number[]) {
  if (!v.length) return 0;
  const s = [...v].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function meanVar(v: number[]) {
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  const s2 = v.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, v.length - 1);
  return [m, s2] as const;
}

/**
 * How the player scores relative to their own constant curve, split by chart note makeup.
 * Sample: played, not deleted, constant within 2.5 of the B40 floor and up (where scores still vary),
 * with wiki note counts.
 */
export function analyzeInsights(index: ChartIndex, scores: ScoreMap, analysis: RatingAnalysis, info: Record<string, NoteInfo>): Insights {
  const floor = analysis.best.length ? analysis.best[analysis.best.length - 1].chart.constant : 12;
  const minConstant = Math.max(9, Math.floor((floor - 2.5) * 10) / 10);
  const rows: Omit<Sample, "expected" | "residual">[] = [];
  for (const chart of index.charts) {
    const e = scores[chart.id];
    if (!e || chart.deleted || chart.constant < minConstant) continue;
    const song = info[chart.songId];
    const n = song?.c[chart.difficulty]?.n;
    if (!n || !n[0] || !song.d) continue;
    const [total, tap, flick, slide, katch, rotate] = n;
    rows.push({
      chart,
      score: e.score,
      f: { tap: tap / total, flick: flick / total, slide: slide / total, catch: katch / total, rotate: rotate / total, density: total / song.d },
    });
  }
  if (rows.length < MIN_SAMPLES) return { count: rows.length, samples: [], minConstant, features: [], expectedAt: () => 0 };

  const [a, b] = robustLine(
    rows.map((r) => r.chart.constant),
    rows.map((r) => r.score),
  );
  const expectedAt = (c: number) => Math.min(1_010_000, a + b * c);
  const samples: Sample[] = rows.map((r) => {
    const expected = expectedAt(r.chart.constant);
    return { ...r, expected, residual: Math.max(-CLIP, Math.min(CLIP, r.score - expected)) };
  });

  const features: FeatureResult[] = FEATURES.map(({ key, label, unit }) => {
    const sorted = [...samples].sort((p, q) => p.f[key] - q.f[key]);
    const third = Math.floor(sorted.length / 3);
    const low = sorted.slice(0, third).map((s) => s.residual);
    const high = sorted.slice(sorted.length - third).map((s) => s.residual);
    const [mh, vh] = meanVar(high);
    const [ml, vl] = meanVar(low);
    const se = Math.sqrt(vh / high.length + vl / low.length) || 1;
    return { key, label, unit, diff: mh - ml, t: (mh - ml) / se, cut: sorted[sorted.length - third].f[key], n: samples.length };
  });
  features.sort((p, q) => p.diff - q.diff);
  return { count: rows.length, samples, minConstant, features, expectedAt };
}

export const fmtFeature = (key: FeatureKey, v: number, l: Locale = "ko") => (key === "density" ? `${v.toFixed(1)}${PER_SEC[l]}` : `${Math.round(v * 100)}%`);
