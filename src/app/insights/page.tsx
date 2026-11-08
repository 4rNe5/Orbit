"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Jacket } from "@/components/jacket";
import { loadSongInfo } from "@/components/song-dialog";
import { SongButton } from "@/components/song-dialog";
import { ButtonLink, DiffMark, Empty, Loading, PageHeader } from "@/components/ui";
import { chartRating } from "@/lib/core/rating";
import { fmtScore } from "@/lib/format";
import { analyzeInsights, fmtFeature, MIN_SAMPLES, type FeatureResult, type NoteInfo, type Sample } from "@/lib/insights";
import { computeTargets } from "@/lib/targets";

/** 이/가 by the final syllable (labels end in Hangul). */
const iga = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? "이" : "가";
};
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v)).toLocaleString()}`;

export default function InsightsPage() {
  const { ready, index, scores, analysis } = useApp();
  const [info, setInfo] = useState<Record<string, NoteInfo> | null>(null);
  useEffect(() => {
    let alive = true;
    loadSongInfo().then((m) => alive && setInfo(m as unknown as Record<string, NoteInfo>));
    return () => {
      alive = false;
    };
  }, []);

  const res = useMemo(() => (index && analysis && info ? analyzeInsights(index, scores, analysis, info) : null), [index, scores, analysis, info]);
  const targets = useMemo(() => (index && analysis ? computeTargets(index, scores, analysis) : []), [index, scores, analysis]);

  if (!ready || !res) return <Loading label="채보 성향을 계산하는 중" />;

  if (res.count < MIN_SAMPLES)
    return (
      <>
        <PageHeader title="채보 성향" />
        <Empty title={`정수 ${res.minConstant.toFixed(1)} 이상 점수가 ${MIN_SAMPLES}개 필요해요`} action={<ButtonLink href="/scores" variant="primary">점수 입력하기</ButtonLink>}>
          지금 {res.count}개예요. 비슷한 난이도에서 어떤 노트 구성의 채보를 잘 치고 못 치는지 비교하려면 표본이 더 있어야 합니다.
        </Empty>
      </>
    );

  const weak = res.features.filter((f) => f.diff < 0 && Math.abs(f.t) >= 2);
  const strong = [...res.features].reverse().filter((f) => f.diff > 0 && Math.abs(f.t) >= 2);
  const top = weak[0];
  const lean = [...res.features].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];

  // charts most below the player's own curve, preferring ones where the usual score would count for B40
  const floor = analysis!.best.length >= 40 ? analysis!.best[39].effective : 0;
  const byGap = [...res.samples].filter((s) => s.score < s.expected).sort((a, b) => a.residual - b.residual);
  const counts = byGap.filter((s) => chartRating(s.chart.constant, Math.round(s.expected), s.chart.deleted) > floor);
  const under = (counts.length ? counts : byGap).slice(0, 8);
  const underCounts = counts.length > 0;
  // practice: charts heavy in the weakest feature that can also lift the rating
  const practice = top
    ? targets
        .map((t) => ({ t, s: res.samples.find((x) => x.chart.id === t.chart.id) }))
        .filter((x) => x.s && x.s.f[top.key] >= top.cut)
        .slice(0, 6)
    : [];

  return (
    <div>
      <PageHeader
        title="채보 성향"
        lead={`정수 ${res.minConstant.toFixed(1)} 이상 ${res.count}개 채보의 점수를 내 정수별 평균선과 비교하고, 노트 구성에 따라 차이가 나는지 봅니다.`}
      />

      <section className="rounded-[var(--radius-panel)] border border-line bg-paper p-4 sm:p-6">
        <p className="text-[15px] leading-relaxed">
          {top ? (
            <>
              <b className="text-warn">{top.label}</b>{iga(top.label)} 높은 채보(상위 1/3, {fmtFeature(top.key, top.cut)} 이상)에서 예상보다 평균{" "}
              <b className="num">{Math.abs(Math.round(top.diff)).toLocaleString()}점</b> 낮아요.
              {strong[0] && (
                <>
                  {" "}
                  반대로 <b className="text-good">{strong[0].label}</b>{iga(strong[0].label)} 높은 채보는 <b className="num">{Math.round(strong[0].diff).toLocaleString()}점</b> 높아요.
                </>
              )}
            </>
          ) : (
            <>
              표본 오차를 넘는 뚜렷한 약점은 없어요.
              {lean && (
                <>
                  {" "}
                  가장 큰 차이는 <b>{lean.label}</b>{iga(lean.label)} 높은 채보에서 <b className="num">{signed(lean.diff)}점</b>인데, 점수를 더 입력하면 확실해집니다.
                </>
              )}
            </>
          )}
        </p>
        <FeatureChart features={res.features} />
        <p className="mt-3 text-[12px] text-mist">
          막대 = 그 특성이 많은 채보(상위 1/3)와 적은 채보(하위 1/3)의 평균 점수 차이. 흐린 막대는 차이가 표본 오차 수준이라 판단 근거로 약합니다.
        </p>
      </section>

      {practice.length > 0 && top && (
        <section className="mt-8">
          <h2 className="mb-1 text-[17px] font-semibold">약점 연습 + 레이팅 상승</h2>
          <p className="mb-3 text-[13px] text-mist">{top.label}{iga(top.label)} 높으면서, 이 채보 하나만 올려도 레이팅이 +0.001 오르는 곡이에요.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {practice.map(({ t, s }) => (
              <li key={t.chart.id}>
                <SongButton songId={t.chart.songId} label={t.chart.title} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-paper/70 p-2.5 pr-4 hover:border-line-2">
                  <Jacket songId={t.chart.songId} title={t.chart.songTitle || t.chart.title} difficulty={t.chart.difficulty} rounded="rounded-lg" className="w-12" thumb />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold group-hover:text-accent">{t.chart.title}</div>
                    <div className="flex items-center gap-2 text-[12px] text-mist">
                      <DiffMark d={t.chart.difficulty} constant={t.chart.constant} />
                      <span>{fmtFeature(top.key, s!.f[top.key])}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-[15px] font-bold text-accent">+{t.need.toLocaleString()}</div>
                    <div className="num text-[11px] text-mist">→ {fmtScore(t.minScore)}</div>
                  </div>
                </SongButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-1 text-[17px] font-semibold">내 평균보다 낮은 곡</h2>
        <p className="mb-3 text-[13px] text-mist">
          같은 정수에서 보통 내는 점수보다 크게 낮은 채보예요.
          {underCounts ? " 평소 점수만 내도 B40에 들어가거나 순위가 오르는 곡만 골랐어요." : " 한 번 더 치면 오를 가능성이 큽니다."}
        </p>
        <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          {under.map((s) => (
            <UnderRow key={s.chart.id} s={s} />
          ))}
        </ol>
      </section>

      <p className="mt-6 text-[12px] leading-relaxed text-mist">
        방법: 표본 채보의 점수를 정수에 대해 직선으로 맞춘 값(이상치에 덜 흔들리는 Huber 회귀)을 &ldquo;예상 점수&rdquo;로 두고, 실제 점수와의 차이를 ±30,000점에서 자릅니다. 노트 수와 곡 길이는 Rotaeno 위키 데이터입니다.
      </p>
    </div>
  );
}

function UnderRow({ s }: { s: Sample }) {
  return (
    <li>
      <SongButton songId={s.chart.songId} label={s.chart.title} className="group flex w-full items-center gap-3 px-3 py-2.5 sm:px-4">
        <Jacket songId={s.chart.songId} title={s.chart.songTitle || s.chart.title} difficulty={s.chart.difficulty} rounded="rounded-lg" className="w-10 ring-1 ring-inset ring-line" thumb />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium group-hover:text-accent">{s.chart.title}</div>
          <DiffMark d={s.chart.difficulty} constant={s.chart.constant} />
        </div>
        <div className="text-right">
          <div className="num text-[14px]">
            {fmtScore(s.score)} <span className="text-mist">/ 예상 {fmtScore(Math.round(s.expected))}</span>
          </div>
          <div className="num text-[12px] font-semibold text-warn">{signed(s.score - s.expected)}</div>
        </div>
      </SongButton>
    </li>
  );
}

/** Diverging bars around zero: left = weaker than usual, right = stronger. HTML so text stays readable on phones. */
function FeatureChart({ features }: { features: FeatureResult[] }) {
  const max = Math.max(1500, ...features.map((f) => Math.abs(f.diff)));
  return (
    <div className="mt-5 max-w-[680px]" role="img" aria-label="노트 특성별 평균 점수 차이">
      <div className="flex flex-col gap-1.5">
        {features.map((f) => {
          const weakEvidence = Math.abs(f.t) < 2;
          const w = `${(Math.abs(f.diff) / max) * 50}%`;
          return (
            <div key={f.key} className="grid grid-cols-[84px_1fr_64px] items-center gap-2 sm:grid-cols-[104px_1fr_76px]" style={{ opacity: weakEvidence ? 0.4 : 1 }}>
              <span className="truncate text-[12px] text-ink-2 sm:text-[13px]">{f.label}</span>
              <div className="relative h-5">
                <div className="absolute inset-y-[-3px] left-1/2 w-px bg-line-2" />
                <div
                  className="absolute top-0 h-5 rounded"
                  style={{ width: w, minWidth: 2, background: f.diff < 0 ? "var(--warn)" : "var(--good)", ...(f.diff < 0 ? { right: "50%" } : { left: "50%" }) }}
                />
              </div>
              <span className="num text-right text-[12px] font-semibold sm:text-[13px]">{signed(f.diff)}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-[84px_1fr_64px] gap-2 text-[11px] text-mist sm:grid-cols-[104px_1fr_76px]">
        <span />
        <div className="flex justify-between">
          <span>← 예상보다 낮음</span>
          <span>예상보다 높음 →</span>
        </div>
      </div>
    </div>
  );
}
