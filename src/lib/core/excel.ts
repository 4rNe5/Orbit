/**
 * Excel-compatible rounding helpers.
 * Excel evaluates ROUND/TRUNC on the value shown with 15 significant digits,
 * so 16.67325 (stored as 16.673249999…) rounds up to 16.6733.
 */

function decimalParts(x: number): { sign: number; int: string; frac: string } | null {
  if (!Number.isFinite(x)) return null;
  const sign = x < 0 ? -1 : 1;
  const s = Math.abs(x).toPrecision(15);
  if (s.includes("e")) return null;
  const [int, frac = ""] = s.split(".");
  return { sign, int, frac };
}

/** Excel ROUND(x, digits): half away from zero on the 15-digit representation. */
export function excelRound(x: number, digits: number): number {
  const p = decimalParts(x);
  if (!p) return Math.round(x * 10 ** digits) / 10 ** digits;
  const frac = p.frac.padEnd(digits + 1, "0");
  let n = BigInt(p.int + frac.slice(0, digits));
  if (frac.charCodeAt(digits) >= 53 /* '5' */) n += BigInt(1);
  return (p.sign * Number(n)) / 10 ** digits;
}

/** Excel TRUNC(x, digits) on the 15-digit representation. */
export function excelTrunc(x: number, digits: number): number {
  const p = decimalParts(x);
  if (!p) return Math.trunc(x * 10 ** digits) / 10 ** digits;
  const frac = p.frac.padEnd(digits, "0");
  return (p.sign * Number(BigInt(p.int + frac.slice(0, digits)))) / 10 ** digits;
}

/** Converts a 4-decimal value to integer units of 1e-4 without float drift. */
export function toUnits4(x: number): number {
  return Math.round(x * 10000);
}
