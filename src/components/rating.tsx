import { tierOf, tierRange, tierStyle } from "@/lib/tiers";
import { cx } from "./ui";

/** The in-game rating emblem for this rating. */
export function TierBadge({ rating, size = 28, className }: { rating: number; size?: number; className?: string }) {
  const t = tierOf(rating);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={t.icon}
      alt={`레이팅 휘장 (${tierRange(t)})`}
      title={`레이팅 휘장 · ${tierRange(t)}`}
      width={size}
      height={size}
      className={cx("inline-block shrink-0 object-contain [filter:drop-shadow(0_0_1px_rgb(0_0_0/0.55))_drop-shadow(0_1px_2px_rgb(0_0_0/0.3))]", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Rating numeral painted with its tier's emblem colours. */
export function RatingNumber({ rating, digits = 3, className }: { rating: number; digits?: number; className?: string }) {
  return (
    <span className={cx("num tier-text", className)} style={tierStyle(rating)}>
      {rating.toFixed(digits)}
    </span>
  );
}
