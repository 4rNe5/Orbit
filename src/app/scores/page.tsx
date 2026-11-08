"use client";

import { useCallback, useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { applyChartFilter, ChartFilterBar, useChartFilter } from "@/components/chart-filter";
import { ScoreRow } from "@/components/score-row";
import { Button, ButtonLink, Chip, ImportIcon, Loading, PageHeader, Segmented } from "@/components/ui";
import type { Lamp } from "@/lib/core/types";
import { defineDict, useT } from "@/lib/i18n";

const T = defineDict({
  ko: {
    title: "점수 입력",
    importScores: "점수 가져오기",
    lead: "점수를 입력하고 Enter를 누르면 저장되고 다음 칸으로 넘어갑니다. ",
    saveAccount: "계정에 자동 저장됩니다.",
    saveLocal: "로그인 전에는 이 기기에만 저장됩니다.",
    reach: " 지금은 정수 {c} 이상만 B40에 들어갈 수 있습니다.",
    onlyReachable: "B40 진입 가능만",
    status: "입력 상태",
    all: "전체",
    played: "입력함",
    unplayed: "미입력",
    sort: "정렬",
    byConstant: "정수순",
    byRating: "레이팅순",
    byVersion: "최신곡순",
    byDefault: "게임 순서",
    count: "{n}개 채보",
    colChart: "채보",
    colScore: "점수",
    colLamp: "램프",
    colRating: "레이팅",
    more: "{n}개 더 보기",
  },
  ja: {
    title: "スコア入力",
    importScores: "スコアを取り込む",
    lead: "スコアを入力して Enter を押すと保存され、次の欄に移動します。",
    saveAccount: "アカウントに自動保存されます。",
    saveLocal: "ログインするまではこの端末にのみ保存されます。",
    reach: "現在は定数 {c} 以上の譜面のみ B40 に入れます。",
    onlyReachable: "B40 入り可能のみ",
    status: "入力状態",
    all: "すべて",
    played: "入力済み",
    unplayed: "未入力",
    sort: "並び替え",
    byConstant: "定数順",
    byRating: "レート順",
    byVersion: "新曲順",
    byDefault: "ゲーム内順",
    count: "{n}譜面",
    colChart: "譜面",
    colScore: "スコア",
    colLamp: "ランプ",
    colRating: "レート",
    more: "さらに {n} 件表示",
  },
  zh: {
    title: "录入分数",
    importScores: "导入分数",
    lead: "输入分数后按 Enter 即可保存并跳到下一栏。",
    saveAccount: "将自动保存到账号。",
    saveLocal: "登录前仅保存在本设备上。",
    reach: "目前只有定数 {c} 以上的谱面能进入 B40。",
    onlyReachable: "仅显示可进 B40",
    status: "录入状态",
    all: "全部",
    played: "已录入",
    unplayed: "未填写",
    sort: "排序",
    byConstant: "按定数",
    byRating: "按 Rating",
    byVersion: "按新曲",
    byDefault: "游戏内顺序",
    count: "{n} 个谱面",
    colChart: "谱面",
    colScore: "分数",
    colLamp: "达成状态",
    colRating: "Rating",
    more: "再显示 {n} 个",
  },
});

type Sort = "constant" | "rating" | "default" | "version";
type Status = "all" | "played" | "unplayed";

export default function ScoresPage() {
  const { ready, charts, analysis, scores, setScoreValue, setLamp, session } = useApp();
  const { state, set } = useChartFilter();
  const [sort, setSort] = useState<Sort>("constant");
  const [status, setStatus] = useState<Status>("all");
  const [onlyReachable, setOnlyReachable] = useState(false);
  const [limit, setLimit] = useState(80);
  const t = useT(T);

  const onScore = useCallback((id: string, score: number | null) => setScoreValue(id, score), [setScoreValue]);
  const onLamp = useCallback((id: string, lamp: Lamp) => setLamp(id, lamp), [setLamp]);

  const list = useMemo(() => {
    if (!analysis) return [];
    const minC = analysis.minConstantForBest;
    let l = applyChartFilter(charts, state).filter((c) => {
      const has = scores[c.id] !== undefined;
      if (status === "played" && !has) return false;
      if (status === "unplayed" && has) return false;
      if (onlyReachable && minC !== null && c.constant < minC) return false;
      return true;
    });
    l = [...l].sort((a, b) => {
      if (sort === "constant") return b.constant - a.constant || a.defaultOrder - b.defaultOrder;
      if (sort === "rating") return analysis.byId[a.id].rank - analysis.byId[b.id].rank;
      if (sort === "version") return b.updateOrder - a.updateOrder;
      return a.defaultOrder - b.defaultOrder;
    });
    return l;
  }, [charts, state, analysis, scores, status, sort, onlyReachable]);

  if (!ready || !analysis) return <Loading />;
  const minC = analysis.minConstantForBest;

  return (
    <div>
      <PageHeader
        title={t("title")}
        actions={
          <ButtonLink href="/import">
            <ImportIcon />
            {t("importScores")}
          </ButtonLink>
        }
        lead={
          <>
            {t("lead")}
            {session ? t("saveAccount") : t("saveLocal")}
            {minC !== null && t("reach", { c: minC.toFixed(1) })}
          </>
        }
      />

      <ChartFilterBar
        state={state}
        set={(p) => {
          set(p);
          setLimit(80);
        }}
        charts={charts}
        extra={
          minC !== null && (
            <Chip active={onlyReachable} onClick={() => setOnlyReachable((v) => !v)}>
              {t("onlyReachable")}
            </Chip>
          )
        }
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Status>
          label={t("status")}
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: t("all") },
            { value: "played", label: t("played") },
            { value: "unplayed", label: t("unplayed") },
          ]}
        />
        <Segmented<Sort>
          label={t("sort")}
          value={sort}
          onChange={setSort}
          options={[
            { value: "constant", label: t("byConstant") },
            { value: "rating", label: t("byRating") },
            { value: "version", label: t("byVersion") },
            { value: "default", label: t("byDefault") },
          ]}
        />
      </div>

      <p className="mt-4 text-[13px] text-mist">{t("count", { n: list.length.toLocaleString() })}</p>
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
        <li className="hidden grid-cols-[minmax(0,1fr)_150px_96px_92px] gap-x-3 px-4 py-2 text-[12px] text-mist sm:grid">
          <span>{t("colChart")}</span>
          <span className="text-right">{t("colScore")}</span>
          <span className="text-center">{t("colLamp")}</span>
          <span className="text-right">{t("colRating")}</span>
        </li>
        {list.slice(0, limit).map((c) => {
          const r = analysis.byId[c.id];
          const e = scores[c.id];
          return (
            <ScoreRow
              key={c.id}
              chart={c}
              score={e ? e.score : null}
              lamp={e ? e.lamp : "none"}
              rating={r.rating}
              effective={r.effective}
              rank={r.rank}
              excluded={r.excluded}
              onScore={onScore}
              onLamp={onLamp}
            />
          );
        })}
      </ul>
      {list.length > limit && (
        <div className="mt-4 flex justify-center">
          <Button onClick={() => setLimit((l) => l + 200)}>{t("more", { n: Math.min(200, list.length - limit) })}</Button>
        </div>
      )}
    </div>
  );
}
