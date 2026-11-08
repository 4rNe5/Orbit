"use client";

import { memo, useState } from "react";
import type { Chart, Lamp } from "@/lib/core/types";
import { fmtScore, grade, parseScoreInput } from "@/lib/format";
import { Jacket } from "./jacket";
import { cx, DiffMark } from "./ui";
import { SongButton } from "./song-dialog";
import { packName } from "@/lib/packs";
import { defineDict, useLocale, useT } from "@/lib/i18n";

const T = defineDict({
  ko: {
    deleted: "삭제곡",
    scoreOf: "{title} {diff} 점수",
    score: "점수",
    range: "0–1,010,000 사이로 입력",
    lamp: "클리어 램프",
    empty: "미입력",
    alphaHigher: "IV-α가 더 높음",
    ivHigher: "IV가 더 높음",
  },
  ja: {
    deleted: "削除曲",
    scoreOf: "{title} {diff} スコア",
    score: "スコア",
    range: "0–1,010,000 の範囲で入力",
    lamp: "クリアランプ",
    empty: "未入力",
    alphaHigher: "IV-α の方が高い",
    ivHigher: "IV の方が高い",
  },
  zh: {
    deleted: "已删除曲目",
    scoreOf: "{title} {diff} 分数",
    score: "分数",
    range: "请输入 0–1,010,000",
    lamp: "达成状态",
    empty: "未填写",
    alphaHigher: "IV-α 更高",
    ivHigher: "IV 更高",
  },
});

export interface ScoreRowProps {
  chart: Chart;
  score: number | null;
  lamp: Lamp;
  rating: number;
  effective: number;
  rank: number;
  excluded: boolean;
  onScore: (chartId: string, score: number | null) => void;
  onLamp: (chartId: string, lamp: Lamp) => void;
  readOnly?: boolean;
}

function ScoreRowInner({ chart, score, lamp, rating, effective, rank, excluded, onScore, onLamp, readOnly }: ScoreRowProps) {
  const t = useT(T);
  const locale = useLocale();
  const [draft, setDraft] = useState(score === null ? "" : String(score));
  const [invalid, setInvalid] = useState(false);
  const [seen, setSeen] = useState(score);
  if (seen !== score) {
    // the stored score changed elsewhere (import, sync): show it
    setSeen(score);
    setDraft(score === null ? "" : String(score));
  }

  const commit = () => {
    const v = parseScoreInput(draft);
    if (v === null) {
      setInvalid(false);
      if (score !== null) onScore(chart.id, null);
      return;
    }
    if (Number.isNaN(v)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (v !== score) onScore(chart.id, v);
  };

  const apPlus = score !== null && score >= 1_010_000;
  const inBest = score !== null && rank <= 40 && effective > 0;

  return (
    <li className={cx("row-auto grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_150px_96px_92px] sm:px-4", chart.deleted && "opacity-55")}>
      <SongButton songId={chart.songId} label={chart.title} className="group flex min-w-0 items-center gap-3 rounded-[12px]">
        <Jacket songId={chart.songId} title={chart.songTitle || chart.title} difficulty={chart.difficulty} rounded="rounded-[10px]" className="w-12 ring-1 ring-inset ring-line transition group-hover:ring-2 group-hover:ring-accent" thumb />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <DiffMark d={chart.difficulty} constant={chart.constant} />
            {inBest && <span className="num rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold text-accent">B{rank}</span>}
            {chart.deleted && <span className="text-[11px] text-mist">{t("deleted")}</span>}
          </div>
          <div className="mt-0.5 truncate text-[14px] font-medium group-hover:text-accent" title={chart.title}>
            {chart.title}
          </div>
          <div className="truncate text-[12px] text-mist">{packName(chart.pack, locale)}</div>
        </div>
      </SongButton>

      <div className="flex flex-col items-end gap-1 sm:items-stretch">
        {readOnly ? (
          <span className="num text-[15px] font-semibold">{fmtScore(score)}</span>
        ) : (
          <input
            inputMode="numeric"
            aria-label={t("scoreOf", { title: chart.title, diff: chart.difficulty })}
            aria-invalid={invalid}
            placeholder={t("score")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit();
                const all = Array.from(document.querySelectorAll<HTMLInputElement>("input[data-score]"));
                const i = all.indexOf(e.currentTarget);
                all[i + 1]?.focus();
              }
              if (e.key === "Escape") setDraft(score === null ? "" : String(score));
            }}
            data-score
            className={cx(
              "num h-10 w-36 rounded-[10px] border bg-paper px-3 text-right text-[15px] focus:outline-none sm:w-full",
              invalid ? "border-danger" : "border-line focus:border-orbit",
            )}
          />
        )}
        {invalid && <span className="text-[11px] text-danger">{t("range")}</span>}
      </div>

      <div className="flex items-center gap-1 sm:justify-center" role="group" aria-label={t("lamp")}>
        {apPlus ? (
          <span className="ap-bg rounded-full px-2.5 py-1 text-[11px] font-bold">AP+</span>
        ) : (
          (["fc", "ap"] as const).map((l) => (
            <button
              key={l}
              disabled={readOnly || score === null}
              aria-pressed={lamp === l}
              onClick={() => onLamp(chart.id, lamp === l ? "none" : l)}
              className={cx(
                "h-7 rounded-full border px-2.5 text-[11px] font-semibold transition disabled:opacity-40",
                lamp === l ? (l === "ap" ? "border-ap bg-ap text-black/80" : "border-fc bg-fc text-black/80") : "border-line text-mist hover:text-ink",
              )}
            >
              {l.toUpperCase()}
            </button>
          ))
        )}
      </div>

      <div className="text-right">
        {score === null ? (
          <span className="text-[12px] text-mist">{t("empty")}</span>
        ) : (
          <>
            <div className={cx("num text-[15px] font-semibold", excluded && "text-mist line-through decoration-1")}>{rating.toFixed(4)}</div>
            <div className="text-[11px] text-mist">{excluded ? (chart.difficulty === "IV" ? t("alphaHigher") : t("ivHigher")) : grade(score)}</div>
          </>
        )}
      </div>
    </li>
  );
}

export const ScoreRow = memo(ScoreRowInner);
