"use client";

import { SongButton } from "@/components/song-dialog";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { DiffMark, Loading, PageHeader, Panel, Segmented, Stat } from "@/components/ui";
import { Jacket } from "@/components/jacket";
import { fmtPercent, fmtScore } from "@/lib/format";
import { defineDict, useT } from "@/lib/i18n";

const T = defineDict({
  ko: {
    title: "완성도",
    lead: "곡마다 IV(또는 가장 잘 친 I–IV 중 하나)와 IV-α가 각각 최대 1점입니다. 레이팅 비율, EX+ 보너스, FC·AP·AP+ 보너스로 점수가 정해지고, 낮은 난이도일수록 0.7–0.9배가 됩니다.",
    total: "총 완성도",
    filled: "채운 점수",
    remaining: "남은 점수",
    max: "최대 완성도",
    maxHint: "삭제곡을 뺀 IV와 IV-α 수",
    byBand: "난이도 구간별",
    colBand: "구간",
    colFill: "채운 정도",
    colCount: "곡 수",
    colCompletion: "완성도",
    colGap: "남은 양",
    under11: "11 미만",
    lowestTitle: "완성도가 낮은 곡",
    unplayedTitle: "아직 안 친 곡",
    listLabel: "목록",
    lowest: "낮은 순",
    unplayed: "미플레이",
    none: "해당하는 곡이 없습니다.",
  },
  ja: {
    title: "完成度",
    lead: "各曲のIV（またはI–IVのうち最も良いもの）とIV-αがそれぞれ最大1点です。レート比率、EX+ボーナス、FC・AP・AP+ボーナスで点数が決まり、低い難易度ほど0.7–0.9倍になります。",
    total: "総合完成度",
    filled: "獲得ポイント",
    remaining: "残りポイント",
    max: "最大完成度",
    maxHint: "削除曲を除いたIVとIV-αの数",
    byBand: "難易度区間別",
    colBand: "区間",
    colFill: "達成状況",
    colCount: "曲数",
    colCompletion: "完成度",
    colGap: "残り",
    under11: "11未満",
    lowestTitle: "完成度が低い曲",
    unplayedTitle: "まだプレイしていない曲",
    listLabel: "一覧",
    lowest: "低い順",
    unplayed: "未プレイ",
    none: "該当する曲がありません。",
  },
  zh: {
    title: "完成度",
    lead: "每首曲目的 IV（或 I–IV 中打得最好的一个）与 IV-α 各计最多 1 分。分值由 Rating 比例、EX+ 奖励和 FC/AP/AP+ 奖励决定，难度越低按 0.7–0.9 倍计算。",
    total: "总完成度",
    filled: "已获得分值",
    remaining: "剩余分值",
    max: "最大完成度",
    maxHint: "不含已删除曲目的 IV 与 IV-α 数量",
    byBand: "按难度区间",
    colBand: "区间",
    colFill: "完成情况",
    colCount: "曲目数",
    colCompletion: "完成度",
    colGap: "剩余",
    under11: "低于 11",
    lowestTitle: "完成度较低的曲目",
    unplayedTitle: "尚未游玩的曲目",
    listLabel: "列表",
    lowest: "从低到高",
    unplayed: "未游玩",
    none: "没有符合条件的曲目。",
  },
});

type View = "lowest" | "unplayed";

export default function CompletionPage() {
  const { ready, completion, scores } = useApp();
  const [view, setView] = useState<View>("lowest");
  const t = useT(T);

  const slots = useMemo(() => {
    if (!completion) return [];
    const counted = Object.values(completion.charts).filter((c) => c.counted);
    return counted
      .filter((c) => (view === "unplayed" ? c.value === 0 : c.value > 0 && c.value < 1))
      .sort((a, b) => (view === "unplayed" ? b.mainConstant - a.mainConstant : a.value - b.value || b.mainConstant - a.mainConstant))
      .slice(0, 60);
  }, [completion, view]);

  if (!ready || !completion) return <Loading />;
  const maxBand = Math.max(...completion.bands.map((b) => b.slots), 1);

  return (
    <div>
      <PageHeader
        title={t("title")}
        lead={t("lead")}
      />

      <Panel className="grid gap-6 p-5 sm:grid-cols-[1fr_2fr] sm:p-6">
        <div>
          <div className="text-[13px] text-mist">{t("total")}</div>
          <div className="num mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em]">{fmtPercent(completion.percent)}</div>
          <div className="num mt-2 text-[13px] text-mist">
            {completion.total.toFixed(3)} / {completion.max}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-orbit" style={{ width: `${completion.percent * 100}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Stat label={t("filled")} value={completion.total.toFixed(3)} />
          <Stat label={t("remaining")} value={(completion.max - completion.total).toFixed(3)} />
          <Stat label={t("max")} value={completion.max} hint={t("maxHint")} />
        </div>
      </Panel>

      <section className="mt-8">
        <h2 className="mb-3 text-[17px] font-semibold">{t("byBand")}</h2>
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-mist">
                <th className="px-4 py-2.5 font-normal">{t("colBand")}</th>
                <th className="px-2 py-2.5 font-normal">{t("colFill")}</th>
                <th className="px-2 py-2.5 text-right font-normal">{t("colCount")}</th>
                <th className="px-2 py-2.5 text-right font-normal">{t("colCompletion")}</th>
                <th className="px-4 py-2.5 text-right font-normal">{t("colGap")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {completion.bands.map((b) => (
                <tr key={b.key}>
                  <td className="num px-4 py-3 font-semibold">{b.key === "lt11" ? t("under11") : b.label}</td>
                  <td className="w-[40%] px-2 py-3">
                    <div className="h-2.5 rounded-full bg-line" style={{ width: `${(b.slots / maxBand) * 100}%`, minWidth: b.slots ? 8 : 0 }}>
                      <div className="h-full rounded-full bg-orbit" style={{ width: b.slots ? `${(b.total / b.slots) * 100}%` : 0 }} />
                    </div>
                  </td>
                  <td className="num px-2 py-3 text-right">{b.slots}</td>
                  <td className="num px-2 py-3 text-right">{b.total.toFixed(3)}</td>
                  <td className="num px-4 py-3 text-right text-mist">{b.gap.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold">{view === "lowest" ? t("lowestTitle") : t("unplayedTitle")}</h2>
          <Segmented<View>
            label={t("listLabel")}
            value={view}
            onChange={setView}
            options={[
              { value: "lowest", label: t("lowest") },
              { value: "unplayed", label: t("unplayed") },
            ]}
          />
        </div>
        <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          {slots.map((s) => (
            <li key={s.chart.id} className="flex items-center gap-3 px-3 py-2 sm:px-4">
              <SongButton songId={s.chart.songId} label={s.chart.title} className="group flex min-w-0 flex-1 items-center gap-3">
                <Jacket songId={s.chart.songId} title={s.chart.songTitle || s.chart.title} difficulty={s.chart.difficulty} rounded="rounded-lg" className="w-9 ring-1 ring-inset ring-line transition group-hover:ring-2 group-hover:ring-accent" thumb />
                <DiffMark d={s.chart.difficulty} constant={s.chart.constant} />
                <span className="min-w-0 flex-1 truncate text-[14px] group-hover:text-accent">{s.chart.title}</span>
              </SongButton>
              <span className="num hidden text-[13px] text-mist sm:inline">{fmtScore(scores[s.chart.id]?.score)}</span>
              <span className="num w-16 text-right font-semibold">{s.value.toFixed(3)}</span>
            </li>
          ))}
          {slots.length === 0 && <li className="px-4 py-6 text-sm text-mist">{t("none")}</li>}
        </ol>
      </section>
    </div>
  );
}
