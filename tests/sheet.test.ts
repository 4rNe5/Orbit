import { readFileSync } from "node:fs";
import readXlsx from "read-excel-file/node";
import { describe, expect, it } from "vitest";
import chartsJson from "../src/data/charts.json";
import fixA from "./fixtures/fixA.json";
import type { Chart } from "../src/lib/core/types";
import { readMasterSheet, readScoreSheet, type SheetTable } from "../src/lib/sheet";

const SHEET = process.env.ROTAENO_SHEET; // filled analysis sheet (fixture A), optional
const charts = chartsJson as Chart[];

describe.skipIf(!SHEET)("xlsx import", () => {
  it("reads scores and lamps from a filled 2.27.0 sheet", async () => {
    const tables = (await readXlsx(readFileSync(SHEET!))) as unknown as SheetTable[];
    const r = readScoreSheet(tables, charts);
    expect(r.unmatched).toEqual([]);
    expect(r.sheetVersion).toBe("2.27.0");
    expect(Object.keys(r.scores).length).toBe(Object.keys(fixA.inputs).length);
    for (const [id, v] of Object.entries(fixA.inputs)) expect(r.scores[id]).toEqual({ score: v.score, lamp: v.score >= 1010000 ? "ap" : v.lamp });
  });

  it("reads the chart master identically to the extraction script", async () => {
    const tables = (await readXlsx(readFileSync(SHEET!))) as unknown as SheetTable[];
    const m = readMasterSheet(tables);
    expect(m.version).toBe("2.27.0");
    expect(m.theoretical).toBe(17.885);
    expect(m.charts).toEqual(charts);
    expect(m.history?.rows.length).toBe(415);
  });
});
