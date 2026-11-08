import { describe, expect, it } from "vitest";
import chartsJson from "../src/data/charts.json";
import fixA from "./fixtures/fixA.json";
import fixB from "./fixtures/fixB.json";
import { analyze, chartRating, createTargetEngine, indexCharts, theoreticalRating } from "../src/lib/core/rating";
import { analyzeCompletion } from "../src/lib/core/completion";
import { excelRound, excelTrunc } from "../src/lib/core/excel";
import type { Chart, ScoreMap } from "../src/lib/core/types";

const index = indexCharts(chartsJson as Chart[]);

type Fixture = typeof fixA;

function scoresOf(fix: Fixture): ScoreMap {
  const out: ScoreMap = {};
  for (const [id, v] of Object.entries(fix.inputs)) {
    out[id] = { score: v.score, lamp: v.lamp === "fc" ? "fc" : v.lamp === "ap" ? "ap" : "none" };
  }
  return out;
}

describe("excel helpers", () => {
  it("rounds half away from zero on 15 significant digits", () => {
    expect(excelRound(16.67325, 4)).toBe(16.6733);
    expect(excelRound(14.16845, 4)).toBe(14.1685);
    expect(excelRound(0.0004999999999, 3)).toBe(0);
    expect(excelTrunc(17.2329999999, 3)).toBe(17.232);
  });
});

describe("chartRating", () => {
  it("matches the score bands", () => {
    expect(chartRating(13, 1_010_000)).toBeCloseTo(16.6, 10);
    expect(chartRating(13, 1_009_999)).toBeCloseTo(16.5999, 10);
    expect(chartRating(13, 1_008_000)).toBeCloseTo(16.4, 10);
    expect(chartRating(13, 1_004_000)).toBeCloseTo(15.4, 10);
    expect(chartRating(13, 1_000_000)).toBeCloseTo(15, 10);
    expect(chartRating(13, 980_000)).toBeCloseTo(14, 10);
    expect(chartRating(13, 950_000)).toBeCloseTo(13, 10);
    expect(chartRating(13, 900_000)).toBeCloseTo(12, 10);
    expect(chartRating(13, 500_000)).toBeCloseTo(8, 10);
    expect(chartRating(13, 100)).toBe(0);
    expect(chartRating(13, 1_009_000, true)).toBe(0);
  });
});

describe("theoretical", () => {
  it("is 17.886 with exact arithmetic (sheet shows 17.885 from float truncation)", () => {
    expect(theoreticalRating(index)).toBe(17.886);
  });
});

for (const [name, fix] of [["A (815 charts)", fixA], ["B (25 charts)", fixB]] as const) {
  describe(`sheet 2.27.0 parity — scenario ${name}`, () => {
    const scores = scoresOf(fix as Fixture);
    const a = analyze(index, scores);
    const e = fix.expected;

    it("total rating", () => {
      expect(a.rating).toBe(e.H9);
      expect(a.totalMicro / 1e6).toBeCloseTo(e.L39, 9);
      expect(a.toNext).toBeCloseTo(e.N39, 9);
    });

    it("every chart rating, effective rating and rank", () => {
      let mismatch = 0;
      for (const [id, x] of Object.entries(e.charts)) {
        const r = a.byId[id];
        if (r.rating !== x.N || r.effective !== x.S || r.rank !== x.rank) mismatch++;
      }
      expect(mismatch).toBe(0);
    });

    it("best 40 list and bracket stats", () => {
      const sheetBest = e.best.filter((b) => b.score);
      expect(a.best.map((b) => b.score)).toEqual(sheetBest.map((b) => b.score));
      expect(a.best.map((b) => b.rating)).toEqual(sheetBest.map((b) => b.rating));
      expect(a.distance.b10 ?? "").toEqual(e.L47);
      expect(a.distance.b20 ?? "").toEqual(e.N47);
      expect(a.distance.b40 ?? "").toEqual(e.P47);
      expect(a.apPlusInBest).toBe(e.R47);
      if (a.played >= 40) {
        expect(a.minConstantForBest).toBe(e.P39);
        expect(a.pivots.r1).toBeCloseTo(e.L43, 4);
        expect(a.pivots.r40).toBeCloseTo(e.R43, 4);
      }
    });

    it("completion total, maximum and bands", () => {
      const c = analyzeCompletion(index, scores);
      expect(c.total).toBeCloseTo(e.completion.I9, 9);
      expect(c.max).toBe(e.completion.I35);
      expect(c.percent).toBeCloseTo(e.completion.V10, 9);
      c.bands.forEach((b, i) => {
        expect(b.slots).toBe(e.completion.bands[i].H);
        expect(b.total).toBeCloseTo(e.completion.bands[i].J, 9);
      });
      let mismatch = 0;
      for (const [id, x] of Object.entries(e.charts)) {
        const cc = c.charts[id];
        if (Math.abs(cc.value - x.W) > 1e-9 || Math.abs(cc.point - x.Y) > 1e-9) mismatch++;
      }
      expect(mismatch).toBe(0);
    });

    it("+0.001 target scores are sufficient and minimal", () => {
      const eng = createTargetEngine(index, scores, a);
      let checked = 0;
      for (const c of index.charts) {
        const s = eng.minScore(c.id);
        if (s === null) continue;
        checked++;
        expect(eng.totalWith(c.id, s)).toBeGreaterThanOrEqual(eng.nextThreshold);
        const cur = scores[c.id]?.score ?? 0;
        if (s - 1 > cur) expect(eng.totalWith(c.id, s - 1)).toBeLessThan(eng.nextThreshold);
        // cross-check the engine against a full recomputation
        if (checked % 97 === 0) {
          const full = analyze(index, { ...scores, [c.id]: { score: s, lamp: "none" } });
          expect(full.totalMicro).toBe(eng.totalWith(c.id, s));
        }
      }
      expect(checked).toBeGreaterThan(0);
    });
  });
}
