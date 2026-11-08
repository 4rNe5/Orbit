"use client";

import { defineDict, useLocale, useT } from "@/lib/i18n";
import { tierOf, tierRange, tierStyle } from "@/lib/tiers";
import { cx } from "./ui";

const T = defineDict({
  ko: { alt: "레이팅 휘장 ({range})", title: "레이팅 휘장 · {range}" },
  ja: { alt: "レートエンブレム ({range})", title: "レートエンブレム · {range}" },
  zh: { alt: "Rating 徽标 ({range})", title: "Rating 徽标 · {range}" },
});

/** The in-game rating emblem for this rating. */
export function TierBadge({ rating, size = 28, className }: { rating: number; size?: number; className?: string }) {
  const t = tierOf(rating);
  const tr = useT(T);
  const range = tierRange(t, useLocale());
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={t.icon}
      alt={tr("alt", { range })}
      title={tr("title", { range })}
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
