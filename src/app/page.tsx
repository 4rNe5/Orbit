"use client";

import { nextTier, tierStyle } from "@/lib/tiers";
import { RatingNumber, TierBadge } from "@/components/rating";
import { SongButton } from "@/components/song-dialog";
import { RecentUpdates } from "@/components/recent-updates";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/app-provider";
import { BestTile } from "@/components/best-tile";
import { Jacket } from "@/components/jacket";
import { ButtonLink, DiffMark, ImportIcon, Loading } from "@/components/ui";
import { fmtPercent, fmtScore } from "@/lib/format";
import { computeTargets } from "@/lib/targets";
import { LanguageSwitcher } from "@/components/language-switcher";
import { defineDict, useT } from "@/lib/i18n";

const T = defineDict({
  ko: {
    loading: "궤도를 그리는 중",
    traveler: "트래블러",
    guest: "게스트",
    emptyTitle: "아직 기록이 없어요",
    emptyLead: "점수를 직접 입력하거나 TapTap 세이브·분석표를 가져오면 B40, 대상곡, 완성도가 계산됩니다.",
    enterScores: "점수 입력하기",
    importSheet: "시트·세이브 가져오기",
    importScores: "점수 가져오기",
    songCount: "{n}곡",
    theoretical: "이론치 {v}",
    theoreticalShort: "이론치",
    next001: "다음 +0.001",
    nextEmblem: "다음 휘장",
    nextEmblemValue: "{min}까지 {gap}",
    completion: "완성도",
    apCount: "{n}개",
    b40All: "B40 전체",
    targets: "대상곡",
    top10: "상위 10곡",
    viewAllB40: "B40 전체",
    recent: "최근 갱신",
    pushTitle: "조금만 더 치면 오르는 곡",
    all: "전체",
    footer: "곡 데이터 {version} · {n}채보 · 자켓·곡 정보 출처 Rotaeno 위키",
    avgOf: "{label} 평균",
  },
  ja: {
    loading: "軌道を描いています",
    traveler: "トラベラー",
    guest: "ゲスト",
    emptyTitle: "まだ記録がありません",
    emptyLead: "スコアを入力するか、TapTap のセーブやレート分析表を取り込むと、B40・対象曲・完成度が計算されます。",
    enterScores: "スコアを入力",
    importSheet: "シート・セーブを取り込む",
    importScores: "スコアを取り込む",
    songCount: "{n}曲",
    theoretical: "理論値 {v}",
    theoreticalShort: "理論値",
    next001: "次の+0.001",
    nextEmblem: "次のエンブレム",
    nextEmblemValue: "{min}まで {gap}",
    completion: "完成度",
    apCount: "{n}曲",
    b40All: "B40一覧",
    targets: "対象曲",
    top10: "上位10曲",
    viewAllB40: "B40一覧",
    recent: "最近の更新",
    pushTitle: "あと少しでレートが上がる曲",
    all: "すべて",
    footer: "楽曲データ {version} · {n}譜面 · ジャケット・楽曲情報の出典 Rotaeno Wiki",
    avgOf: "{label} 平均",
  },
  zh: {
    loading: "正在绘制轨道",
    traveler: "旅行者",
    guest: "游客",
    emptyTitle: "还没有记录",
    emptyLead: "录入分数，或导入 TapTap 存档、Rating 分析表后，即可计算 B40、推分目标和完成度。",
    enterScores: "录入分数",
    importSheet: "导入表格/存档",
    importScores: "导入分数",
    songCount: "{n} 首",
    theoretical: "理论值 {v}",
    theoreticalShort: "理论值",
    next001: "下一个+0.001",
    nextEmblem: "下一徽标",
    nextEmblemValue: "距 {min} 还差 {gap}",
    completion: "完成度",
    apCount: "{n} 首",
    b40All: "完整 B40",
    targets: "推分目标",
    top10: "前10首",
    viewAllB40: "完整 B40",
    recent: "最近更新",
    pushTitle: "再推一点就能涨分的曲目",
    all: "全部",
    footer: "曲目数据 {version} · {n} 个谱面 · 曲绘与曲目信息来源：Rotaeno Wiki",
    avgOf: "{label} 平均",
  },
});

function avg(v: number[]) {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

export default function Home() {
  const { ready, analysis, completion, index, scores, version, session, profile, events } = useApp();
  const t = useT(T);

  const targets = useMemo(
    () => (index && analysis && analysis.played > 0 ? computeTargets(index, scores, analysis).slice(0, 4) : []),
    [index, scores, analysis],
  );

  if (!ready || !analysis || !completion) return <Loading label={t("loading")} />;

  const empty = analysis.played === 0;
  const name = profile?.display_name || (session ? t("traveler") : t("guest"));
  const maxR = version?.theoreticalRating ?? 17.886;
  const nt = nextTier(analysis.rating);
  const eff = analysis.best.map((b) => b.effective);
  const top = analysis.best.slice(0, 10);

  if (empty) {
    return (
      <div className="max-w-2xl pt-2">
        <div className="mb-6 flex gap-1.5">
          {["suito", "heavens-cage", "uchronia", "aleph-0", "igallta", "angel-dust", "re-birth", "stage-5"].map((id) => (
            <Jacket key={id} songId={id} title={id} rounded="rounded-[6px]" className="w-12 sm:w-14" thumb />
          ))}
        </div>
        <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.01em] sm:text-[28px]">{t("emptyTitle")}</h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-2">{t("emptyLead")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink href="/scores" variant="primary">
            {t("enterScores")}
          </ButtonLink>
          <ButtonLink href="/import">
            <ImportIcon />
            {t("importSheet")}
          </ButtonLink>
        </div>
        <div className="mt-8 border-t border-line pt-4">
          <LanguageSwitcher variant="inline" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* rating */}
      <section className="relative overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper p-5 sm:p-6">
        <div className="tier-glow pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full opacity-20 blur-3xl sm:-right-20 sm:-top-24 sm:h-80 sm:w-80" style={tierStyle(analysis.rating)} aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[14px] text-mist">
              <span className="truncate font-semibold text-ink">{name}</span>
              <span>·</span>
              <span>{t("songCount", { n: analysis.played.toLocaleString() })}</span>
            </div>
            <div className="mt-1 flex items-end gap-3">
              <TierBadge rating={analysis.rating} size={56} className="mb-1 sm:h-[64px] sm:w-[64px]" />
              <RatingNumber rating={analysis.rating} className="text-[56px] font-bold leading-[0.9] tracking-[-0.03em] sm:text-[68px]" />
              <span className="mb-1.5 hidden text-[13px] text-mist sm:block">
                {t("theoretical", { v: maxR.toFixed(3) })}
                <br />
                <span className="num text-ink-2">−{(maxR - analysis.rating).toFixed(3)}</span>
              </span>
            </div>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
              <Fact label={t("theoreticalShort")} value={`${maxR.toFixed(3)} (−${(maxR - analysis.rating).toFixed(3)})`} className="sm:hidden" />
              <Fact label={t("next001")} value={analysis.toNext.toFixed(6)} />
              {nt && <Fact label={t("nextEmblem")} value={t("nextEmblemValue", { min: nt.min.toFixed(3), gap: (nt.min - analysis.rating).toFixed(3) })} />}
              <Fact label={t("completion")} value={fmtPercent(completion.percent)} />
              <Fact label="B40 AP+" value={t("apCount", { n: analysis.apPlusInBest })} />
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/best" variant="primary">
              {t("b40All")}
            </ButtonLink>
            <ButtonLink href="/targets">{t("targets")}</ButtonLink>
            <ButtonLink href="/import">
              <ImportIcon />
              {t("importScores")}
            </ButtonLink>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-x-6 gap-y-3 border-t border-line pt-4 sm:max-w-md">
          <Mini label="B1–10" value={avg(eff.slice(0, 10)).toFixed(3)} />
          <Mini label="B11–20" value={avg(eff.slice(10, 20)).toFixed(3)} />
          <Mini label="B21–40" value={avg(eff.slice(20, 40)).toFixed(3)} />
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* top charts */}
        <section className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[16px] font-bold">{t("top10")}</h2>
            <Link href="/best" className="text-[13px] font-medium text-accent hover:underline">
              {t("viewAllB40")}
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
            {top.map((r) => (
              <BestTile key={r.chart.id} r={r} />
            ))}
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-8">
          {targets.length > 0 && (
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[16px] font-bold">{t("pushTitle")}</h2>
                <Link href="/targets" className="text-[13px] font-medium text-accent hover:underline">
                  {t("all")}
                </Link>
              </div>
              <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
                {targets.map((tg) => (
                  <li key={tg.chart.id}>
                    <SongButton songId={tg.chart.songId} label={tg.chart.title} className="flex w-full items-center gap-3 px-3 py-2.5 transition hover:bg-paper-2">
                      <Jacket songId={tg.chart.songId} title={tg.chart.songTitle || tg.chart.title} difficulty={tg.chart.difficulty} rounded="rounded-[6px]" className="w-10" thumb />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold">{tg.chart.title}</div>
                        <div className="flex items-center gap-2 text-[12px] text-mist">
                          <DiffMark d={tg.chart.difficulty} constant={tg.chart.constant} />
                          <span className="num truncate">→ {fmtScore(tg.minScore)}</span>
                        </div>
                      </div>
                      <span className="num shrink-0 text-right text-[14px] font-bold text-accent">+{tg.need.toLocaleString()}</span>
                    </SongButton>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {events.length > 0 && (
            <section>
              <h2 className="mb-3 text-[16px] font-bold">{t("recent")}</h2>
              <RecentUpdates />
            </section>
          )}
        </aside>
      </div>

      {version && (
        <p className="mt-8 text-[12px] text-mist">
          {t("footer", { version: version.version, n: version.chartCount.toLocaleString() })}
        </p>
      )}
    </div>
  );
}

function Fact({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-baseline gap-1.5 ${className ?? ""}`}>
      <dt className="text-mist">{label}</dt>
      <dd className="num font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  const t = useT(T);
  return (
    <div>
      <div className="text-[12px] text-mist">{t("avgOf", { label })}</div>
      <div className="num text-[19px] font-semibold">{value}</div>
    </div>
  );
}
