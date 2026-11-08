export type Difficulty = "I" | "II" | "III" | "IV" | "IV-α";

export const DIFFICULTIES: Difficulty[] = ["I", "II", "III", "IV", "IV-α"];

export interface Chart {
  id: string; // `${songId}:${difficulty}`
  songId: string;
  title: string; // chart title (IV-α may differ from the song title)
  songTitle: string;
  difficulty: Difficulty;
  constant: number;
  level: string;
  pack: string;
  songPack: string;
  version: string;
  defaultOrder: number;
  updateOrder: number;
  deleted: boolean;
}

/** Clear lamp entered by the player. AP+ is derived from score === 1,010,000. */
export type Lamp = "none" | "fc" | "ap";

export interface ScoreEntry {
  score: number;
  lamp: Lamp;
}

export type ScoreMap = Record<string, ScoreEntry>;

export interface ChartResult {
  chart: Chart;
  score: number | null;
  lamp: Lamp;
  apPlus: boolean;
  /** Raw single-chart rating (sheet column P), before IV/IV-α exclusion. */
  raw: number;
  /** Displayed single-chart rating, ROUND(raw, 4) (sheet column N). */
  rating: number;
  /** Rating counted toward the total after IV/IV-α exclusion, ROUND(·, 4) (sheet column S). */
  effective: number;
  /** True when this chart is shadowed by the other IV / IV-α chart of the same song. */
  excluded: boolean;
  rank: number;
}

export interface RatingAnalysis {
  /** Displayed rating (TRUNC 3). */
  rating: number;
  /** Exact weighted total in units of 1e-6. */
  totalMicro: number;
  results: ChartResult[];
  byId: Record<string, ChartResult>;
  /** Top 40 played charts in rank order. */
  best: ChartResult[];
  played: number;
  /** Rating still needed to reach the next 0.001 (sheet 统计表!N39). */
  toNext: number;
  /** Rating of ranks 1, 10, 20, 40 (sheet 统计表 L43:R43). */
  pivots: { r1: number | null; r10: number | null; r20: number | null; r40: number | null };
  /** Score distance to 1,010,000 per bracket (sheet 统计表 L47:P47). */
  distance: { b10: number | null; b20: number | null; b40: number | null };
  apPlusInBest: number;
  /** Lowest chart constant that can still enter the best 40 (sheet 统计表!P39). */
  minConstantForBest: number | null;
}
