"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useApp } from "@/components/app-provider";
import { Jacket } from "@/components/jacket";
import { loadSongInfo } from "@/components/song-dialog";
import { SongButton } from "@/components/song-dialog";
import { ButtonLink, DiffMark, Empty, Loading, PageHeader } from "@/components/ui";
import { chartRating } from "@/lib/core/rating";
import { fmtScore } from "@/lib/format";
import { analyzeInsights, fmtFeature, MIN_SAMPLES, type FeatureResult, type NoteInfo, type Sample } from "@/lib/insights";
import { computeTargets } from "@/lib/targets";
import { defineDict, useLocale, useT } from "@/lib/i18n";

const T = defineDict({
  ko: {
    calculating: "채보 성향을 계산하는 중",
    title: "채보 성향",
    needTitle: "정수 {c} 이상 점수가 {n}개 필요해요",
    goScores: "점수 입력하기",
    needBody: "지금 {n}개예요. 비슷한 난이도에서 어떤 노트 구성의 채보를 잘 치고 못 치는지 비교하려면 표본이 더 있어야 합니다.",
    lead: "정수 {c} 이상 {n}개 채보의 점수를 내 정수별 평균선과 비교하고, 노트 구성에 따라 차이가 나는지 봅니다.",
    weak: "{label}{iga} 높은 채보(상위 1/3, {cut} 이상)에서 예상보다 평균 {pts} 낮아요.",
    strong: " 반대로 {label}{iga} 높은 채보는 {pts} 높아요.",
    noWeak: "표본 오차를 넘는 뚜렷한 약점은 없어요.",
    lean: " 가장 큰 차이는 {label}{iga} 높은 채보에서 {pts}인데, 점수를 더 입력하면 확실해집니다.",
    pts: "{n}점",
    chartNote: "막대 = 그 특성이 많은 채보(상위 1/3)와 적은 채보(하위 1/3)의 평균 점수 차이. 흐린 막대는 차이가 표본 오차 수준이라 판단 근거로 약합니다.",
    practiceTitle: "약점 연습 + 레이팅 상승",
    practiceLead: "{label}{iga} 높으면서, 이 채보 하나만 올려도 레이팅이 +0.001 오르는 곡이에요.",
    underTitle: "내 평균보다 낮은 곡",
    underLead: "같은 정수에서 보통 내는 점수보다 크게 낮은 채보예요.",
    underCounts: " 평소 점수만 내도 B40에 들어가거나 순위가 오르는 곡만 골랐어요.",
    underRetry: " 한 번 더 치면 오를 가능성이 큽니다.",
    method: "방법: 표본 채보의 점수를 정수에 대해 직선으로 맞춘 값(이상치에 덜 흔들리는 Huber 회귀)을 “예상 점수”로 두고, 실제 점수와의 차이를 ±30,000점에서 자릅니다. 노트 수와 곡 길이는 Rotaeno 위키 데이터입니다.",
    expected: "/ 예상 {score}",
    chartAria: "노트 특성별 평균 점수 차이",
    lower: "← 예상보다 낮음",
    higher: "예상보다 높음 →",
    subjI: "이",
    subjGa: "가",
  },
  ja: {
    calculating: "譜面傾向を計算中",
    title: "譜面傾向",
    needTitle: "定数 {c} 以上のスコアが {n} 件必要です",
    goScores: "スコアを入力する",
    needBody: "現在 {n} 件です。近い難易度の中で、どんなノーツ構成の譜面が得意・苦手かを比べるには、もっとサンプルが必要です。",
    lead: "定数 {c} 以上の {n} 譜面のスコアを、自分の定数ごとの平均線と比べ、ノーツ構成によって差が出るかを調べます。",
    weak: "{label}が高い譜面（上位1/3、{cut} 以上）では、予想より平均 {pts} 低いです。",
    strong: "逆に、{label}が高い譜面では {pts} 高いです。",
    noWeak: "サンプル誤差を超える明確な苦手はありません。",
    lean: "最も差が大きいのは{label}が高い譜面での {pts} ですが、スコアをもっと入力するとはっきりします。",
    pts: "{n}点",
    chartNote: "棒 = その特徴が多い譜面（上位1/3）と少ない譜面（下位1/3）の平均スコアの差。薄い棒は差がサンプル誤差の範囲内で、判断材料としては弱いものです。",
    practiceTitle: "苦手練習 + レートアップ",
    practiceLead: "{label}が高く、この譜面ひとつを伸ばすだけでレートが +0.001 上がる曲です。",
    underTitle: "自分の平均より低い曲",
    underLead: "同じ定数で普段出しているスコアより大きく低い譜面です。",
    underCounts: "普段どおりのスコアを出すだけで B40 入りや順位アップになる曲だけを選びました。",
    underRetry: "もう一度プレイすれば伸びる可能性が高いです。",
    method: "方法：サンプル譜面のスコアを定数に対して直線で当てはめた値（外れ値に強い Huber 回帰）を「予想スコア」とし、実際のスコアとの差を ±30,000 点で打ち切ります。ノーツ数と曲の長さは Rotaeno Wiki のデータです。",
    expected: "/ 予想 {score}",
    chartAria: "ノーツ特性ごとの平均スコア差",
    lower: "← 予想より低い",
    higher: "予想より高い →",
    subjI: "",
    subjGa: "",
  },
  zh: {
    calculating: "正在计算谱面倾向",
    title: "谱面倾向",
    needTitle: "需要 {n} 个定数 {c} 以上的分数",
    goScores: "去录入分数",
    needBody: "目前有 {n} 个。要比较相近难度下哪些音符构成的谱面打得好、哪些打得差，需要更多样本。",
    lead: "将定数 {c} 以上 {n} 个谱面的分数与你各定数的平均线比较，看看音符构成不同是否会带来差异。",
    weak: "在{label}高的谱面（前 1/3，{cut} 以上）上，比预期平均低 {pts}。",
    strong: "相反，{label}高的谱面高出 {pts}。",
    noWeak: "没有超出样本误差的明显弱项。",
    lean: "差异最大的是{label}高的谱面（{pts}），录入更多分数后会更明确。",
    pts: "{n} 分",
    chartNote: "柱 = 该特征较多的谱面（前 1/3）与较少的谱面（后 1/3）的平均分数差。浅色柱表示差异在样本误差范围内，参考价值较低。",
    practiceTitle: "弱项练习 + Rating 提升",
    practiceLead: "{label}较高，且只需提升这一个谱面就能让 Rating +0.001 的曲目。",
    underTitle: "低于自身平均的曲目",
    underLead: "比你在同定数下的常规分数低很多的谱面。",
    underCounts: "只挑选了打出平时水平就能进入 B40 或提升排名的曲目。",
    underRetry: "再打一次很可能提高。",
    method: "方法：将样本谱面的分数对定数做直线拟合（使用不易受离群值影响的 Huber 回归），作为“预期分数”，并将与实际分数的差值截断在 ±30,000 分以内。音符数与曲目时长来自 Rotaeno Wiki。",
    expected: "/ 预期 {score}",
    chartAria: "各音符特征的平均分数差",
    lower: "← 低于预期",
    higher: "高于预期 →",
    subjI: "",
    subjGa: "",
  },
});

/** 이/가 by the final syllable (labels end in Hangul). Korean only; ja/zh sentences have no {iga} slot. */
const iga = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? T.ko.subjI : T.ko.subjGa;
};

/** Fills {name} slots of a translated string with nodes. */
function rich(s: string, nodes: Record<string, ReactNode>): ReactNode {
  return s.split(/(\{\w+\})/).map((part, i) => {
    const k = /^\{(\w+)\}$/.exec(part)?.[1];
    return k && k in nodes ? <Fragment key={i}>{nodes[k]}</Fragment> : part;
  });
}
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v)).toLocaleString()}`;

export default function InsightsPage() {
  const { ready, index, scores, analysis } = useApp();
  const [info, setInfo] = useState<Record<string, NoteInfo> | null>(null);
  const t = useT(T);
  const locale = useLocale();
  useEffect(() => {
    let alive = true;
    loadSongInfo().then((m) => alive && setInfo(m as unknown as Record<string, NoteInfo>));
    return () => {
      alive = false;
    };
  }, []);

  const res = useMemo(() => (index && analysis && info ? analyzeInsights(index, scores, analysis, info) : null), [index, scores, analysis, info]);
  const targets = useMemo(() => (index && analysis ? computeTargets(index, scores, analysis) : []), [index, scores, analysis]);

  if (!ready || !res) return <Loading label={t("calculating")} />;

  if (res.count < MIN_SAMPLES)
    return (
      <>
        <PageHeader title={t("title")} />
        <Empty title={t("needTitle", { c: res.minConstant.toFixed(1), n: MIN_SAMPLES })} action={<ButtonLink href="/scores" variant="primary">{t("goScores")}</ButtonLink>}>
          {t("needBody", { n: res.count })}
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
        title={t("title")}
        lead={t("lead", { c: res.minConstant.toFixed(1), n: res.count })}
      />

      <section className="rounded-[var(--radius-panel)] border border-line bg-paper p-4 sm:p-6">
        <p className="text-[15px] leading-relaxed">
          {top ? (
            <>
              {rich(t("weak", { iga: iga(top.label.ko), cut: fmtFeature(top.key, top.cut, locale) }), {
                label: <b className="text-warn">{top.label[locale]}</b>,
                pts: <b className="num">{t("pts", { n: Math.abs(Math.round(top.diff)).toLocaleString() })}</b>,
              })}
              {strong[0] &&
                rich(t("strong", { iga: iga(strong[0].label.ko) }), {
                  label: <b className="text-good">{strong[0].label[locale]}</b>,
                  pts: <b className="num">{t("pts", { n: Math.round(strong[0].diff).toLocaleString() })}</b>,
                })}
            </>
          ) : (
            <>
              {t("noWeak")}
              {lean &&
                rich(t("lean", { iga: iga(lean.label.ko) }), {
                  label: <b>{lean.label[locale]}</b>,
                  pts: <b className="num">{t("pts", { n: signed(lean.diff) })}</b>,
                })}
            </>
          )}
        </p>
        <FeatureChart features={res.features} />
        <p className="mt-3 text-[12px] text-mist">
          {t("chartNote")}
        </p>
      </section>

      {practice.length > 0 && top && (
        <section className="mt-8">
          <h2 className="mb-1 text-[17px] font-semibold">{t("practiceTitle")}</h2>
          <p className="mb-3 text-[13px] text-mist">{t("practiceLead", { label: top.label[locale], iga: iga(top.label.ko) })}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {practice.map(({ t, s }) => (
              <li key={t.chart.id}>
                <SongButton songId={t.chart.songId} label={t.chart.title} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-paper/70 p-2.5 pr-4 hover:border-line-2">
                  <Jacket songId={t.chart.songId} title={t.chart.songTitle || t.chart.title} difficulty={t.chart.difficulty} rounded="rounded-lg" className="w-12" thumb />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold group-hover:text-accent">{t.chart.title}</div>
                    <div className="flex items-center gap-2 text-[12px] text-mist">
                      <DiffMark d={t.chart.difficulty} constant={t.chart.constant} />
                      <span>{fmtFeature(top.key, s!.f[top.key], locale)}</span>
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
        <h2 className="mb-1 text-[17px] font-semibold">{t("underTitle")}</h2>
        <p className="mb-3 text-[13px] text-mist">
          {t("underLead")}
          {underCounts ? t("underCounts") : t("underRetry")}
        </p>
        <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          {under.map((s) => (
            <UnderRow key={s.chart.id} s={s} />
          ))}
        </ol>
      </section>

      <p className="mt-6 text-[12px] leading-relaxed text-mist">
        {t("method")}
      </p>
    </div>
  );
}

function UnderRow({ s }: { s: Sample }) {
  const t = useT(T);
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
            {fmtScore(s.score)} <span className="text-mist">{t("expected", { score: fmtScore(Math.round(s.expected)) })}</span>
          </div>
          <div className="num text-[12px] font-semibold text-warn">{signed(s.score - s.expected)}</div>
        </div>
      </SongButton>
    </li>
  );
}

/** Diverging bars around zero: left = weaker than usual, right = stronger. HTML so text stays readable on phones. */
function FeatureChart({ features }: { features: FeatureResult[] }) {
  const t = useT(T);
  const locale = useLocale();
  const max = Math.max(1500, ...features.map((f) => Math.abs(f.diff)));
  return (
    <div className="mt-5 max-w-[680px]" role="img" aria-label={t("chartAria")}>
      <div className="flex flex-col gap-1.5">
        {features.map((f) => {
          const weakEvidence = Math.abs(f.t) < 2;
          const w = `${(Math.abs(f.diff) / max) * 50}%`;
          return (
            <div key={f.key} className="grid grid-cols-[84px_1fr_64px] items-center gap-2 sm:grid-cols-[104px_1fr_76px]" style={{ opacity: weakEvidence ? 0.4 : 1 }}>
              <span className="truncate text-[12px] text-ink-2 sm:text-[13px]">{f.label[locale]}</span>
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
          <span>{t("lower")}</span>
          <span>{t("higher")}</span>
        </div>
      </div>
    </div>
  );
}
