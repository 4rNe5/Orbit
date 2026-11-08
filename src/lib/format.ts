import type { Difficulty } from "@/lib/core/types";

export const fmtRating = (v: number | null | undefined, digits = 3) =>
  v === null || v === undefined ? "–" : v.toFixed(digits);

export const fmtScore = (v: number | null | undefined) =>
  v === null || v === undefined ? "–" : v.toLocaleString("en-US");

export const fmtSigned = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toLocaleString("en-US")}`;

export const fmtPercent = (v: number, digits = 2) => `${(v * 100).toFixed(digits)}%`;

export const diffClass = (d: Difficulty) => (d === "IV-α" ? "diff-IVa" : `diff-${d}`);

export const DIFF_LABEL: Record<Difficulty, string> = { I: "I", II: "II", "III": "III", IV: "IV", "IV-α": "IV-α" };

/** Score grade shown in-game style. */
export function grade(score: number): string {
  if (score >= 1_010_000) return "AP+";
  if (score >= 1_008_000) return "EX+";
  if (score >= 1_000_000) return "EX";
  if (score >= 980_000) return "S";
  if (score >= 950_000) return "A";
  if (score >= 900_000) return "B";
  return "C";
}

export function parseScoreInput(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0 || n > 1_010_000) return NaN;
  return n;
}

export function relTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
