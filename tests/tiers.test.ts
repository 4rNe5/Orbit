import { describe, expect, it } from "vitest";
import { nextTier, tierOf } from "../src/lib/tiers";

describe("rating emblem tiers (wiki: Rating)", () => {
  it("maps ranges to emblem numbers", () => {
    const cases: [number, number][] = [
      [0, 1], [1.999, 1], [2, 2], [3.999, 2], [4, 3], [6.999, 3], [7, 4], [8, 5], [9, 6], [10, 7], [11, 8],
      [12, 9], [13, 10], [14, 11], [15, 12], [15.999, 12], [16, 14], [16.499, 14], [16.5, 15], [16.999, 15],
      [17, 16], [17.499, 16], [17.5, 17], [17.886, 17],
    ];
    for (const [r, t] of cases) expect([r, tierOf(r).tier]).toEqual([r, t]);
  });
  it("finds the next emblem", () => {
    expect(nextTier(17.2)?.min).toBe(17.5);
    expect(nextTier(17.661)).toBeNull();
  });
});
