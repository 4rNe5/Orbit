"use client";

import { useState } from "react";
import type { Chart, Difficulty } from "@/lib/core/types";
import { diffClass } from "@/lib/format";
import jacketIds from "@/data/jackets.json";
import { cx } from "./ui";

const HAS = new Set(jacketIds as string[]);

export function hasJacket(songId: string) {
  return HAS.has(songId);
}

/** First visible characters of a title, for the placeholder. */
function initials(title: string) {
  const t = title.replace(/[\s:：\-_.~·,!?()[\]]/g, "");
  return t.slice(0, 2) || "♪";
}

/**
 * Square album jacket. Falls back to a difficulty-tinted tile with the song's
 * initials for charts whose art isn't in the bundled set (newest songs).
 */
export function Jacket({
  songId,
  title,
  difficulty,
  className,
  rounded = "rounded-lg",
  eager,
  thumb,
}: {
  songId: string;
  title: string;
  difficulty?: Difficulty;
  className?: string;
  rounded?: string;
  eager?: boolean;
  /** 128px file for list rows (≤ 64px on screen); default is the 256px art. */
  thumb?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const show = HAS.has(songId) && !failed;
  const dc = difficulty ? diffClass(difficulty) : "";
  return (
    <div
      className={cx("relative aspect-square shrink-0 overflow-hidden", dc, rounded, className)}
      style={{ containerType: "size" } as React.CSSProperties}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb ? `/jackets/sm/${songId}.webp` : `/jackets/${songId}.webp`}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="jacket-ph grid h-full w-full place-items-center">
          <span className="num font-semibold text-ink/85" style={{ fontSize: "min(34cqw, 30cqh)" }}>
            {initials(title)}
          </span>
        </div>
      )}
    </div>
  );
}

export function JacketFor({ chart, className, rounded }: { chart: Chart; className?: string; rounded?: string }) {
  return <Jacket songId={chart.songId} title={chart.songTitle || chart.title} difficulty={chart.difficulty} className={className} rounded={rounded} />;
}
