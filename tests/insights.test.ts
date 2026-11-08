import { describe, expect, it } from "vitest";
import chartsJson from "../src/data/charts.json";
import songInfo from "../src/data/songinfo.json";
import { analyze, indexCharts } from "../src/lib/core/rating";
import type { Chart, ScoreMap } from "../src/lib/core/types";
import { analyzeInsights, MIN_SAMPLES, type NoteInfo } from "../src/lib/insights";

const index = indexCharts(chartsJson as Chart[]);
const info = songInfo as unknown as Record<string, NoteInfo>;

/** Deterministic pseudo-noise. */
const noise = (i: number) => (((i * 9301 + 49297) % 233280) / 233280 - 0.5) * 4000;

function player(flickPenalty: number) {
  const scores: ScoreMap = {};
  let i = 0;
  for (const c of index.charts) {
    const n = info[c.songId]?.c[c.difficulty]?.n;
    if (c.deleted || c.constant < 12 || !n) continue;
    const flick = n[2] / n[0];
    const s = 1_004_000 - 4_000 * (c.constant - 12) - flickPenalty * (flick - 0.12) + noise(i++);
    scores[c.id] = { score: Math.round(Math.max(800_000, Math.min(1_010_000, s))), lamp: "none" };
  }
  return scores;
}

describe("note-type insights", () => {
  it("finds a planted flick weakness", () => {
    const scores = player(60_000);
    const res = analyzeInsights(index, scores, analyze(index, scores), info);
    expect(res.count).toBeGreaterThanOrEqual(MIN_SAMPLES);
    const worst = res.features[0];
    expect(worst.key).toBe("flick");
    expect(worst.diff).toBeLessThan(-2_000);
    expect(Math.abs(worst.t)).toBeGreaterThan(2);
  });

  it("reports nothing strong for an even player", () => {
    const scores = player(0);
    const res = analyzeInsights(index, scores, analyze(index, scores), info);
    for (const f of res.features) expect(Math.abs(f.diff)).toBeLessThan(1_500);
  });

  it("needs enough charts", () => {
    const scores: ScoreMap = {};
    for (const c of index.charts.filter((c) => c.constant >= 13 && !c.deleted).slice(0, 10)) scores[c.id] = { score: 1_000_000, lamp: "none" };
    const res = analyzeInsights(index, scores, analyze(index, scores), info);
    expect(res.count).toBeLessThan(MIN_SAMPLES);
    expect(res.features).toEqual([]);
  });
});
