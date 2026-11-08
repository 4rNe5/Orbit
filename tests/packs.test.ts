import { describe, expect, it } from "vitest";
import charts from "../src/data/charts.json";
import jackets from "../src/data/jackets.json";
import { groupPacks, packCategory, packName } from "../src/lib/packs";

const rows = charts as { songId: string; pack: string; songPack: string }[];

describe("Korean pack names", () => {
  it("covers every pack in the current sheet", () => {
    const packs = new Set(rows.flatMap((r) => [r.pack, r.songPack]));
    const missing = [...packs].filter((p) => packCategory(p) === null);
    expect(missing).toEqual([]);
  });

  it("maps names and keeps unknown packs as-is", () => {
    expect(packName("基础歌曲")).toBe("기본 악곡");
    expect(packName("音波狂潮")).toBe("LiveMania");
    expect(packName("새 팩 이름")).toBe("새 팩 이름");
    expect(groupPacks(["机械都市", "基础歌曲", "X"]).map((g) => g.category)).toEqual(["메인 스토리", "음악팩", "새 팩"]);
  });
});

describe("jackets", () => {
  it("has art for every song", () => {
    const have = new Set(jackets as string[]);
    const missing = [...new Set(rows.map((r) => r.songId))].filter((id) => !have.has(id));
    expect(missing).toEqual([]);
  });
});
