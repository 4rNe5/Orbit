"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/app-provider";
import { OrbitChart } from "@/components/orbit-chart";
import { ButtonLink, DiffMark, Loading, Panel, Stat } from "@/components/ui";
import { fmtPercent, fmtRating, fmtScore } from "@/lib/format";
import { computeTargets } from "@/lib/targets";

function avg(v: number[]) {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export default function Home() {
  const { ready, analysis, completion, index, scores, version, session, profile } = useApp();

  const targets = useMemo(
    () => (index && analysis && analysis.played > 0 ? computeTargets(index, scores, analysis).slice(0, 5) : []),
    [index, scores, analysis],
  );

  if (!ready || !analysis || !completion) return <Loading label="궤도를 그리는 중" />;

  const eff = analysis.best.map((b) => b.effective);
  const empty = analysis.played === 0;
  const name = profile?.display_name || (session ? "트래블러" : null);

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="mx-auto w-full max-w-[420px]">
        <OrbitChart
          best={analysis.best}
          rating={empty ? null : analysis.rating}
          caption="레이팅"
          sub={empty ? "점수를 입력하면 채워집니다" : `다음 +0.001까지 ${analysis.toNext.toFixed(6)}`}
        />
        <p className="mt-3 text-center text-[12px] text-mist">바깥 궤도 B1–10, 가운데 B11–20, 안쪽 B21–40</p>
      </div>

      <div className="min-w-0">
        <h1 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[36px]">
          {empty ? "첫 점수를 기다리는 궤도" : name ? `${name}님의 궤도` : "나의 궤도"}
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-mist">
          {empty
            ? "점수를 입력하거나 기존 레이팅 분석 시트를 가져오면 B40, 대상곡, 완성도를 바로 계산합니다."
            : `${analysis.played.toLocaleString()}개 채보 기준입니다. 이론치까지 ${((version?.theoreticalRating ?? 17.886) - analysis.rating).toFixed(3)} 남았습니다.`}
        </p>

        {empty ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href="/scores" variant="primary">
              점수 입력하기
            </ButtonLink>
            <ButtonLink href="/import">시트·파일 가져오기</ButtonLink>
            {!session && <ButtonLink href="/login" variant="ghost">로그인하고 기기 간 동기화</ButtonLink>}
          </div>
        ) : (
          <>
            <Panel className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 p-5 sm:grid-cols-3">
              <Stat label="B1–10 평균" value={fmtRating(avg(eff.slice(0, 10)), 4)} />
              <Stat label="B11–20 평균" value={fmtRating(avg(eff.slice(10, 20)), 4)} />
              <Stat label="B21–40 평균" value={fmtRating(avg(eff.slice(20, 40)), 4)} />
              <Stat label="40위 레이팅" value={fmtRating(analysis.pivots.r40, 4)} />
              <Stat
                label="B40 진입 최저 정수"
                value={analysis.minConstantForBest === null ? "–" : analysis.minConstantForBest.toFixed(1)}
                hint={analysis.minConstantForBest === null ? "40개 이상 입력하면 표시" : "이 정수 미만은 B40 진입 불가"}
              />
              <Stat label="완성도" value={fmtPercent(completion.percent)} hint={`${completion.total.toFixed(3)} / ${completion.max}`} />
            </Panel>

            <section className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[17px] font-semibold">다음 0.001을 올리는 가장 쉬운 곡</h2>
                <Link href="/targets" className="text-[13px] font-medium text-orbit hover:underline">
                  대상곡 전체 보기
                </Link>
              </div>
              {targets.length === 0 ? (
                <p className="text-sm text-mist">혼자서 0.001을 올릴 수 있는 채보가 없습니다. 이론치에 가깝습니다.</p>
              ) : (
                <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
                  {targets.map((t) => (
                    <li key={t.chart.id} className="flex items-center gap-3 px-4 py-3">
                      <DiffMark d={t.chart.difficulty} constant={t.chart.constant} />
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{t.chart.title}</span>
                      <span className="num hidden text-[13px] text-mist sm:inline">
                        {fmtScore(t.current)} → {fmtScore(t.minScore)}
                      </span>
                      <span className="num w-24 text-right text-[14px] font-semibold text-orbit">+{t.need.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}

        {version && (
          <p className="mt-8 text-[12px] text-mist">
            곡 데이터 {version.version}, {version.chartCount.toLocaleString()}채보. 이론 최대 {version.theoreticalRating?.toFixed(3) ?? "–"}.
          </p>
        )}
      </div>
    </div>
  );
}
