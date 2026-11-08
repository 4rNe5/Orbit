"use client";

import { useCallback, useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { applyChartFilter, ChartFilterBar, useChartFilter } from "@/components/chart-filter";
import { ScoreRow } from "@/components/score-row";
import { Button, Chip, Loading, PageHeader, Segmented } from "@/components/ui";
import type { Lamp } from "@/lib/core/types";

type Sort = "constant" | "rating" | "default" | "version";
type Status = "all" | "played" | "unplayed";

export default function ScoresPage() {
  const { ready, charts, analysis, scores, setScoreValue, setLamp, session } = useApp();
  const { state, set } = useChartFilter();
  const [sort, setSort] = useState<Sort>("constant");
  const [status, setStatus] = useState<Status>("all");
  const [onlyReachable, setOnlyReachable] = useState(false);
  const [limit, setLimit] = useState(80);

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
        title="점수 입력"
        lead={
          <>
            점수를 입력하고 Enter를 누르면 저장되고 다음 칸으로 넘어갑니다. {session ? "계정에 자동 저장됩니다." : "로그인 전에는 이 기기에만 저장됩니다."}
            {minC !== null && <> 지금은 정수 {minC.toFixed(1)} 이상만 B40에 들어갈 수 있습니다.</>}
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
              B40 진입 가능만
            </Chip>
          )
        }
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Status>
          label="입력 상태"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "전체" },
            { value: "played", label: "입력함" },
            { value: "unplayed", label: "미입력" },
          ]}
        />
        <Segmented<Sort>
          label="정렬"
          value={sort}
          onChange={setSort}
          options={[
            { value: "constant", label: "정수순" },
            { value: "rating", label: "레이팅순" },
            { value: "version", label: "최신곡순" },
            { value: "default", label: "게임 순서" },
          ]}
        />
      </div>

      <p className="mt-4 text-[13px] text-mist">{list.length.toLocaleString()}개 채보</p>
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
        <li className="hidden grid-cols-[minmax(0,1fr)_150px_96px_92px] gap-x-3 px-4 py-2 text-[12px] text-mist sm:grid">
          <span>채보</span>
          <span className="text-right">점수</span>
          <span className="text-center">램프</span>
          <span className="text-right">레이팅</span>
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
          <Button onClick={() => setLimit((l) => l + 200)}>{Math.min(200, list.length - limit)}개 더 보기</Button>
        </div>
      )}
    </div>
  );
}
