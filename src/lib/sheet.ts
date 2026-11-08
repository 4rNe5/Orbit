import type { Chart, Difficulty, Lamp, ScoreMap } from "@/lib/core/types";
import type { ConstantHistory } from "@/lib/data/charts";
import { currentLocale, defineDict, translate, type Vars } from "@/lib/i18n";

const T = defineDict({
  ko: {
    noScoreSheet: "'{sheet}' 시트를 찾지 못했습니다. Rotaeno 레이팅 분석표 xlsx 파일인지 확인해 주세요.",
    noScoreColumns: "분석표의 '曲名', '难度', '分数' 열을 찾지 못했습니다.",
    noSheet: "'{sheet}' 시트를 찾지 못했습니다.",
    missingColumn: "'{col}' 열이 없습니다. 2.1x 이후 형식의 분석표가 필요합니다.",
    noVersion: "첫 시트에서 게임 버전(ver x.y.z)을 찾지 못했습니다.",
    unknownDifficulty: "알 수 없는 난이도 '{diff}'",
    duplicateChart: "같은 곡 ID와 난이도가 두 번 나옵니다.",
  },
  ja: {
    noScoreSheet: "「{sheet}」シートが見つかりません。Rotaeno レート分析表の xlsx ファイルか確認してください。",
    noScoreColumns: "分析表に「曲名」「难度」「分数」列が見つかりません。",
    noSheet: "「{sheet}」シートが見つかりません。",
    missingColumn: "「{col}」列がありません。2.1x 以降の形式の分析表が必要です。",
    noVersion: "最初のシートにゲームバージョン(ver x.y.z)が見つかりません。",
    unknownDifficulty: "不明な難易度「{diff}」",
    duplicateChart: "同じ楽曲 ID と難易度の組み合わせが重複しています。",
  },
  zh: {
    noScoreSheet: "找不到“{sheet}”工作表。请确认这是 Rotaeno Rating 分析表的 xlsx 文件。",
    noScoreColumns: "分析表中找不到“曲名”“难度”“分数”列。",
    noSheet: "找不到“{sheet}”工作表。",
    missingColumn: "缺少“{col}”列。需要 2.1x 及以后格式的分析表。",
    noVersion: "在第一个工作表中找不到游戏版本(ver x.y.z)。",
    unknownDifficulty: "未知的难度“{diff}”",
    duplicateChart: "存在重复的曲目 ID 与难度组合。",
  },
});
const msg = (k: keyof (typeof T)["ko"], vars?: Vars) => translate(T, currentLocale(), k, vars);

export type Cell = string | number | boolean | Date | null | undefined;
export interface SheetTable {
  sheet: string;
  data: Cell[][];
}

const SCORE_SHEET = "在这里填分数";
const DIFFS: Difficulty[] = ["I", "II", "III", "IV", "IV-α"];

/** Titles used by older sheets that were renamed later (normalized title → song ID). */
const LEGACY_TITLES: Record<string, string> = {
  "sweetdreams(shortver.)": "sweet-dreams",
  nightsky: "night-sky",
};

const str = (v: Cell) => (v === null || v === undefined ? "" : String(v)).trim();
const norm = (s: string) => s.toLowerCase().normalize("NFKC").replace(/\s+/g, "");

function headerIndex(row: Cell[]) {
  const m: Record<string, number> = {};
  row.forEach((h, i) => {
    const k = str(h);
    if (k && m[k] === undefined) m[k] = i;
  });
  return m;
}

function findScoreSheet(tables: SheetTable[]) {
  return tables.find((t) => t.sheet === SCORE_SHEET) ?? tables.find((t) => t.data[0]?.some((c) => str(c) === "分数"));
}

export interface ScoreImport {
  scores: ScoreMap;
  rows: number;
  unmatched: { title: string; difficulty: string; score: number }[];
  sheetVersion: string | null;
}

/**
 * Reads player scores from a "Rotaeno Rating 分析表" workbook.
 * Works with sheets that have a 歌曲ID column (2.1x+) and older ones that only have 曲名.
 */
export function readScoreSheet(tables: SheetTable[], charts: Chart[]): ScoreImport {
  const t = findScoreSheet(tables);
  if (!t) throw new Error(msg("noScoreSheet", { sheet: SCORE_SHEET }));
  const h = headerIndex(t.data[0] ?? []);
  const col = (k: string) => h[k];
  if (col("分数") === undefined || col("难度") === undefined || col("曲名") === undefined)
    throw new Error(msg("noScoreColumns"));

  const byId = new Map(charts.map((c) => [c.id, c]));
  const byTitle = new Map<string, Chart>();
  for (const c of charts) {
    byTitle.set(`${norm(c.title)}|${c.difficulty}`, c);
    if (!byTitle.has(`${norm(c.songTitle)}|${c.difficulty}`)) byTitle.set(`${norm(c.songTitle)}|${c.difficulty}`, c);
  }

  const scores: ScoreMap = {};
  const unmatched: ScoreImport["unmatched"] = [];
  let rows = 0;
  for (const row of t.data.slice(1)) {
    const raw = row[col("分数")];
    if (raw === null || raw === undefined || raw === "") continue;
    const score = Math.round(Number(raw));
    if (!Number.isFinite(score) || score < 0 || score > 1_010_000) continue;
    const diff = str(row[col("难度")]) as Difficulty;
    if (!DIFFS.includes(diff)) continue;
    rows++;
    const title = str(row[col("曲名")]);
    const sid = col("歌曲ID") !== undefined ? str(row[col("歌曲ID")]) : "";
    const legacy = LEGACY_TITLES[norm(title)];
    // A filled 歌曲ID is authoritative; title matching is only for older sheets without IDs.
    const chart = sid
      ? byId.get(`${sid}:${diff}`)
      : byTitle.get(`${norm(title)}|${diff}`) || (legacy ? byId.get(`${legacy}:${diff}`) : undefined);
    if (!chart) {
      unmatched.push({ title, difficulty: diff, score });
      continue;
    }
    const lampCell = Object.keys(h).find((k) => k.startsWith("通关情况"));
    const lv = lampCell ? str(row[h[lampCell]]).toUpperCase() : "";
    const lamp: Lamp = score >= 1_010_000 || lv === "AP" ? "ap" : lv === "FC" ? "fc" : "none";
    const prev = scores[chart.id];
    const rank = (l: Lamp) => (l === "ap" ? 2 : l === "fc" ? 1 : 0);
    scores[chart.id] = prev ? { score: Math.max(prev.score, score), lamp: rank(prev.lamp) >= rank(lamp) ? prev.lamp : lamp } : { score, lamp };
  }

  const guide = tables[0]?.data.flat().map(str).find((s) => /ver\s*[\d.]+/.test(s));
  return { scores, rows, unmatched, sheetVersion: guide ? guide.match(/ver\s*([\d.]+)/)![1] : null };
}

export interface MasterImport {
  version: string;
  theoretical: number | null;
  charts: Chart[];
  history: ConstantHistory | null;
}

function levelLabel(c: number) {
  const base = Math.floor(c + 1e-9);
  return c >= 10 && Math.round((c - base) * 10) >= 6 ? `${base}+` : String(base);
}

/** Reads chart master data (constants, packs, versions, deleted flags) from the analysis workbook. */
export function readMasterSheet(tables: SheetTable[]): MasterImport {
  const t = findScoreSheet(tables);
  if (!t) throw new Error(msg("noSheet", { sheet: SCORE_SHEET }));
  const h = headerIndex(t.data[0] ?? []);
  for (const k of ["曲包", "默认序号", "更新序号", "歌曲ID", "版本", "曲名", "难度", "定数", "是否下架"])
    if (h[k] === undefined) throw new Error(msg("missingColumn", { col: k }));

  const guideCells = tables[0]?.data ?? [];
  const title = guideCells.flat().map(str).find((s) => /ver\s*[\d.]+/.test(s));
  if (!title) throw new Error(msg("noVersion"));
  const version = title.match(/ver\s*([\d.]+)/)![1];
  let theoretical: number | null = null;
  for (const row of guideCells) {
    const vals = row.filter((v) => v !== null && v !== undefined && v !== "");
    if (vals.length >= 2 && str(vals[0]).startsWith("理论rating")) theoretical = Number(vals[1]);
  }

  const charts: Chart[] = [];
  for (const row of t.data.slice(1)) {
    const name = row[h["曲名"]];
    if (name === null || name === undefined || name === "") continue;
    const diff = str(row[h["难度"]]) as Difficulty;
    if (!DIFFS.includes(diff)) throw new Error(msg("unknownDifficulty", { diff }));
    const songId = str(row[h["歌曲ID"]]);
    const c = Math.round(Number(row[h["定数"]]) * 10) / 10;
    charts.push({
      id: `${songId}:${diff}`,
      songId,
      title: str(name),
      songTitle: "",
      difficulty: diff,
      constant: c,
      level: levelLabel(c),
      pack: str(row[h["曲包"]]),
      songPack: "",
      version: str(row[h["版本"]]),
      defaultOrder: Number(row[h["默认序号"]]),
      updateOrder: Number(row[h["更新序号"]]),
      deleted: Number(row[h["是否下架"]]) === 1,
    });
  }
  const bySong = new Map<string, Chart[]>();
  for (const c of charts) bySong.set(c.songId, [...(bySong.get(c.songId) ?? []), c]);
  for (const list of bySong.values()) {
    const iv = list.find((c) => c.difficulty === "IV") ?? list[0];
    const counts = new Map<string, number>();
    for (const c of list) counts.set(c.pack, (counts.get(c.pack) ?? 0) + 1);
    const pack = [...counts].sort((a, b) => b[1] - a[1])[0][0];
    for (const c of list) {
      c.songTitle = iv.title;
      c.songPack = pack;
    }
  }
  if (new Set(charts.map((c) => c.id)).size !== charts.length) throw new Error(msg("duplicateChart"));

  let history: ConstantHistory | null = null;
  const hs = tables.find((x) => x.sheet === "定数编年史");
  if (hs) {
    const hi = hs.data.findIndex((r) => str(r[0]) === "曲名");
    if (hi >= 0) {
      const eras = hs.data[hi].slice(3).map(str).filter(Boolean);
      const byTitle = new Map(charts.map((c) => [`${c.title}|${c.difficulty}`, c.id]));
      const bySongTitle = new Map(charts.map((c) => [`${c.songTitle}|${c.difficulty}`, c.id]));
      history = {
        eras,
        rows: hs.data
          .slice(hi + 1)
          .filter((r) => str(r[0]))
          .map((r) => {
            const key = `${str(r[0])}|${str(r[1])}`;
            return {
              chartId: byTitle.get(key) ?? bySongTitle.get(key) ?? null,
              title: str(r[0]),
              difficulty: str(r[1]),
              addedVersion: str(r[2]) || null,
              values: eras.map((_, i) => {
                const v = r[3 + i];
                return v === null || v === undefined || v === "" ? null : Number(v);
              }),
            };
          }),
      };
    }
  }
  return { version, theoretical, charts: charts.sort((a, b) => a.defaultOrder - b.defaultOrder), history };
}

export function exportCsv(charts: Chart[], scores: ScoreMap, ratingOf: (id: string) => number): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = ["chart_id,title,difficulty,constant,score,lamp,rating"];
  for (const c of charts) {
    const e = scores[c.id];
    if (!e) continue;
    lines.push([c.id, esc(c.title), c.difficulty, c.constant.toFixed(1), e.score, e.score >= 1_010_000 ? "ap+" : e.lamp, ratingOf(c.id).toFixed(4)].join(","));
  }
  return lines.join("\n");
}
