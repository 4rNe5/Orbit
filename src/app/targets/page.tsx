"use client";

import { SongButton } from "@/components/song-dialog";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { applyChartFilter, ChartFilterBar, useChartFilter } from "@/components/chart-filter";
import { Button, ButtonLink, Chip, DiffMark, Empty, Loading, PageHeader, Panel, Segmented, TextInput } from "@/components/ui";
import { Jacket } from "@/components/jacket";
import { analyze } from "@/lib/core/rating";
import { fmtScore, grade } from "@/lib/format";
import { computeTargets, planToRating, type PlanStep } from "@/lib/targets";

type Mode = "next" | "goal";

export default function TargetsPage() {
  const { ready, analysis, index, scores, charts, version } = useApp();
  const maxRating = version?.theoreticalRating ?? 17.886;
  const { state, set } = useChartFilter({ diffs: [] });
  const [mode, setMode] = useState<Mode>("next");
  const [withUnplayed, setWithUnplayed] = useState(false);
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState<{ steps: PlanStep[]; reached: boolean; goal: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<string | null>(null);

  const all = useMemo(() => (index && analysis ? computeTargets(index, scores, analysis) : []), [index, scores, analysis]);

  const goalNum = Number(goal);
  const goalValid = mode === "goal" && goal !== "" && Number.isFinite(goalNum) && analysis && goalNum > analysis.rating && goalNum <= maxRating;
  const single = useMemo(
    () => (goalValid && index && analysis ? computeTargets(index, scores, analysis, Math.round(goalNum * 1000) * 1000) : []),
    [goalValid, goalNum, index, scores, analysis],
  );

  if (!ready || !analysis || !index) return <Loading />;
  if (analysis.played === 0)
    return (
      <>
        <PageHeader title="대상곡 분석" />
        <Empty title="먼저 점수를 입력해 주세요" action={<ButtonLink href="/scores" variant="primary">점수 입력하기</ButtonLink>}>
          대상곡은 지금 B40을 기준으로, 어느 채보를 몇 점 올리면 레이팅이 오르는지 계산합니다.
        </Empty>
      </>
    );

  const allowed = new Set(applyChartFilter(charts, state).map((c) => c.id));
  const list = (mode === "next" ? all : single).filter((t) => allowed.has(t.chart.id) && (withUnplayed || t.current !== null));

  const runPlan = () => {
    if (!goalValid) return;
    setBusy(true);
    setTimeout(() => {
      const res = planToRating(index, scores, (s) => analyze(index, s), goalNum);
      setPlan({ ...res, goal: goalNum });
      setBusy(false);
    }, 20);
  };

  const randomPick = () => {
    const pool = list.slice(0, Math.max(10, Math.ceil(list.length / 5)));
    if (pool.length) setPick(pool[Math.floor(Math.random() * pool.length)].chart.id);
  };

  return (
    <div>
      <PageHeader
        title="대상곡 분석"
        lead="각 채보 하나만 올렸을 때 레이팅이 오르는 최소 점수입니다. 다른 채보는 그대로라고 가정하고, 게임과 같은 반올림을 적용해 1점 단위로 정확히 계산합니다."
        actions={
          <Segmented<Mode>
            label="분석 방식"
            value={mode}
            onChange={setMode}
            options={[
              { value: "next", label: "다음 +0.001" },
              { value: "goal", label: "목표 레이팅" },
            ]}
          />
        }
      />

      {mode === "goal" && (
        <Panel className="mb-4 p-4 sm:p-5">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              runPlan();
            }}
          >
            <label className="flex flex-col gap-1 text-[13px] text-mist">
              목표 레이팅
              <TextInput
                inputMode="decimal"
                value={goal}
                onChange={(e) => {
                  setGoal(e.target.value.replace(/[^0-9.]/g, ""));
                  setPlan(null);
                }}
                placeholder={(analysis.rating + 0.05).toFixed(3)}
                className="num w-36 text-[16px]"
              />
            </label>
            <Button variant="primary" type="submit" disabled={!goalValid || busy}>
              {busy ? "경로 계산 중" : "도달 경로 계산"}
            </Button>
            <p className="basis-full text-[12px] text-mist">
              현재 {analysis.rating.toFixed(3)}. 아래 목록은 한 채보만으로 목표에 닿는 경우이고, 경로 계산은 가장 적은 점수로 0.001씩 올리는 순서를 이어 붙인 결과입니다.
            </p>
          </form>
          {plan && (
            <div className="mt-5">
              <h2 className="mb-2 text-[15px] font-semibold">
                {plan.reached ? `${plan.goal.toFixed(3)}까지 ${plan.steps.length}개 채보` : `${plan.steps.length}개 채보를 올려도 ${plan.goal.toFixed(3)}에 닿지 않았습니다`}
              </h2>
              <ol className="divide-y divide-line rounded-[12px] border border-line">
                {plan.steps.map((s, i) => (
                  <li key={s.chart.id} className="flex items-center gap-3 px-3 py-2.5 text-[14px]">
                    <span className="num w-5 text-mist">{i + 1}</span>
                    <DiffMark d={s.chart.difficulty} constant={s.chart.constant} />
                    <span className="min-w-0 flex-1 truncate">{s.chart.title}</span>
                    <span className="num hidden text-[13px] text-mist sm:inline">
                      {fmtScore(s.from)} → {fmtScore(s.to)}
                    </span>
                    <span className="num w-20 text-right font-semibold">{s.ratingAfter.toFixed(3)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Panel>
      )}

      <ChartFilterBar
        state={state}
        set={set}
        charts={charts}
        extra={
          <>
            <Chip active={withUnplayed} onClick={() => setWithUnplayed((v) => !v)}>
              미입력 채보 포함
            </Chip>
            <Button size="sm" variant="ghost" onClick={randomPick}>
              쉬운 곡 중 하나 골라주기
            </Button>
          </>
        }
      />

      <p className="mt-4 text-[13px] text-mist">
        {mode === "next"
          ? `${list.length.toLocaleString()}개 채보가 혼자서 레이팅을 ${(Math.floor(analysis.rating * 1000 + 1e-6) / 1000 + 0.001).toFixed(3)}까지 올릴 수 있습니다.`
          : goalValid
            ? `${list.length.toLocaleString()}개 채보가 혼자서 ${goalNum.toFixed(3)}에 닿을 수 있습니다.`
            : `현재보다 높고 ${maxRating.toFixed(3)} 이하인 목표를 입력하세요.`}
      </p>
      <ol className="mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
        {list.slice(0, 150).map((t) => {
          const r = analysis.byId[t.chart.id];
          return (
            <li key={t.chart.id} className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${pick === t.chart.id ? "bg-accent-soft" : ""}`}>
              <SongButton songId={t.chart.songId} label={t.chart.title} className="group flex min-w-0 flex-1 items-center gap-3">
              <Jacket songId={t.chart.songId} title={t.chart.songTitle || t.chart.title} difficulty={t.chart.difficulty} rounded="rounded-[10px]" className="w-11 ring-1 ring-inset ring-line transition group-hover:ring-2 group-hover:ring-accent" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <DiffMark d={t.chart.difficulty} constant={t.chart.constant} />
                  {r.score !== null && r.rank <= 40 && r.effective > 0 && (
                    <span className="num rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold text-accent">B{r.rank}</span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[14px] font-medium group-hover:text-accent">{t.chart.title}</div>
              </div>
              </SongButton>
              <div className="hidden text-right sm:block">
                <div className="num text-[14px]">
                  {fmtScore(t.current)} <span className="text-mist">→</span> {fmtScore(t.minScore)}
                </div>
                <div className="text-[11px] text-mist">{grade(t.minScore)} 필요</div>
              </div>
              <div className="w-24 text-right">
                <div className="num text-[16px] font-semibold text-orbit">+{t.need.toLocaleString()}</div>
                <div className="num text-[11px] text-mist sm:hidden">{fmtScore(t.minScore)}</div>
              </div>
            </li>
          );
        })}
      </ol>
      {list.length > 150 && <p className="mt-3 text-[12px] text-mist">필요 점수가 적은 150개만 보여 줍니다. 필터로 좁혀 보세요.</p>}
    </div>
  );
}
