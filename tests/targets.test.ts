import { describe, expect, it } from "vitest";
import chartsJson from "../src/data/charts.json";
import fixA from "./fixtures/fixA.json";
import fixB from "./fixtures/fixB.json";
import { analyze, indexCharts } from "../src/lib/core/rating";
import type { Chart, ScoreMap } from "../src/lib/core/types";
import { computeTargets, planToRating } from "../src/lib/targets";

const index = indexCharts(chartsJson as Chart[]);
const toMap = (inp: Record<string, { score: number; lamp: string }>): ScoreMap =>
  Object.fromEntries(Object.entries(inp).map(([k, v]) => [k, { score: v.score, lamp: v.lamp as "none" }]));

describe("targets", () => {
  for (const [name, fix] of [["A", fixA], ["B", fixB]] as const) {
    it(`every listed target really lifts the rating (${name})`, () => {
      const scores = toMap(fix.inputs);
      const a = analyze(index, scores);
      const t0 = performance.now();
      const list = computeTargets(index, scores, a);
      const ms = performance.now() - t0;
      expect(ms).toBeLessThan(1500);
      expect(list.length).toBeGreaterThan(0);
      for (const t of list.slice(0, 40)) {
        const after = analyze(index, { ...scores, [t.chart.id]: { score: t.minScore, lamp: "none" } });
        expect(after.rating).toBeGreaterThan(a.rating);
        if (t.minScore - 1 > (t.current ?? 0)) {
          const before = analyze(index, { ...scores, [t.chart.id]: { score: t.minScore - 1, lamp: "none" } });
          expect(before.rating).toBe(a.rating);
        }
      }
    });
  }

  it("greedy plan reaches a nearby goal", () => {
    const scores = toMap(fixA.inputs);
    const a = analyze(index, scores);
    const goal = Math.round((a.rating + 0.01) * 1000) / 1000;
    const t0 = performance.now();
    const plan = planToRating(index, scores, (s) => analyze(index, s), goal);
    const ms = performance.now() - t0;
    expect(plan.reached).toBe(true);
    expect(ms).toBeLessThan(8000);
    const final = { ...scores };
    for (const s of plan.steps) final[s.chart.id] = { score: s.to, lamp: "none" };
    expect(analyze(index, final).rating).toBeGreaterThanOrEqual(goal);
  });
});
