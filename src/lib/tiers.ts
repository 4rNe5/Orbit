/**
 * In-game rating emblems (Rotaeno "Rating" frame). Ranges from the Rotaeno wiki
 * "Rating" page; emblem art is the wiki's Rating_Tier_<n>.png (tier 13 is not used
 * by any range). Gradient stops are sampled from each emblem; `light` stops are
 * darkened to stay readable on white.
 */
export interface RatingTier {
  tier: number;
  min: number;
  max: number | null;
  dark: string[];
  light: string[];
  icon: string;
}

const RAW: Omit<RatingTier, "max" | "icon">[] = [
  { tier: 1, min: 0, dark: ["#3fbf2a", "#87ff04", "#c6ff7a"], light: ["#36a424", "#549e02"] },
  { tier: 2, min: 2, dark: ["#1fbf4a", "#03ff03", "#9dff8a"], light: ["#1ba440", "#02a302"] },
  { tier: 3, min: 4, dark: ["#31c185", "#04ff69", "#8affc0"], light: ["#29a270", "#03a343"] },
  { tier: 4, min: 7, dark: ["#00b8e6", "#00e0ff", "#8cf1ff"], light: ["#009bc1", "#009db2"] },
  { tier: 5, min: 8, dark: ["#00a7c4", "#01e4ff", "#a6f6ff"], light: ["#009db8", "#019bad"] },
  { tier: 6, min: 9, dark: ["#3aa9d9", "#66d6ff", "#c2edff"], light: ["#3498c3", "#4796b2"] },
  { tier: 7, min: 10, dark: ["#a88d17", "#e3c51e", "#fff1a6"], light: ["#a88d17", "#a38e16"] },
  { tier: 8, min: 11, dark: ["#e0b000", "#fddf05", "#fff6b0"], light: ["#af8900", "#a28f03"] },
  { tier: 9, min: 12, dark: ["#c40000", "#ff0a0a", "#ff7a6a"], light: ["#c40000", "#ff0a0a"] },
  { tier: 10, min: 13, dark: ["#a70a77", "#e0249e", "#ff86cf"], light: ["#a70a77", "#e0249e"] },
  { tier: 11, min: 14, dark: ["#7a14a0", "#fe0df4", "#ff9cf8"], light: ["#7a14a0", "#f90def"] },
  { tier: 12, min: 15, dark: ["#ff3b1d", "#ffa313", "#cbe320", "#36c8ff", "#b45cff"], light: ["#ff3b1d", "#c77f0f", "#869615", "#2998c2", "#b45cff"] },
  { tier: 14, min: 16, dark: ["#17b954", "#3ae353", "#c0e225"], light: ["#14a34a", "#2aa33c"] },
  { tier: 15, min: 16.5, dark: ["#136ae3", "#0eacce", "#68c9ff"], light: ["#136ae3", "#0d9bb9"] },
  { tier: 16, min: 17, dark: ["#ff6243", "#ff7f32", "#f69d14"], light: ["#f55e40", "#e0702c", "#c57e10"] },
  { tier: 17, min: 17.5, dark: ["#8c80ed", "#b62cff", "#ec54aa"], light: ["#8c80ed", "#b62cff", "#ec54aa"] },
];

export const RATING_TIERS: RatingTier[] = RAW.map((t, i) => ({ ...t, max: RAW[i + 1]?.min ?? null, icon: `/tiers/tier${t.tier}.png` }));

export function tierOf(rating: number): RatingTier {
  let hit = RATING_TIERS[0];
  for (const t of RATING_TIERS) if (rating + 1e-9 >= t.min) hit = t;
  return hit;
}

export function nextTier(rating: number): RatingTier | null {
  return RATING_TIERS.find((t) => t.min > rating + 1e-9) ?? null;
}

const grad = (stops: string[]) => `linear-gradient(118deg, ${stops.join(", ")})`;

/** CSS variables consumed by `.tier-text` / `.tier-bg` (see globals.css). */
export function tierStyle(rating: number): React.CSSProperties {
  const t = tierOf(rating);
  return { "--tg-dark": grad(t.dark), "--tg-light": grad(t.light), "--tier": t.dark[1] } as React.CSSProperties;
}

export function tierRange(t: RatingTier, l: "ko" | "ja" | "zh" = "ko"): string {
  const up = { ko: "이상", ja: "以上", zh: "以上" }[l];
  return t.max === null ? `${t.min.toFixed(3)} ${up}` : `${t.min.toFixed(3)} – ${(t.max - 0.001).toFixed(3)}`;
}
