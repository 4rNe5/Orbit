"use client";

import { nextTier, tierStyle } from "@/lib/tiers";
import { RatingNumber, TierBadge } from "@/components/rating";
import { SongButton } from "@/components/song-dialog";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/app-provider";
import { BestTile } from "@/components/best-tile";
import { Jacket } from "@/components/jacket";
import { ButtonLink, DiffMark, Loading } from "@/components/ui";
import { fmtPercent, fmtScore } from "@/lib/format";
import { computeTargets } from "@/lib/targets";

function avg(v: number[]) {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

export default function Home() {
  const { ready, analysis, completion, index, scores, version, session, profile } = useApp();

  const targets = useMemo(
    () => (index && analysis && analysis.played > 0 ? computeTargets(index, scores, analysis).slice(0, 4) : []),
    [index, scores, analysis],
  );

  if (!ready || !analysis || !completion) return <Loading label="궤도를 그리는 중" />;

  const empty = analysis.played === 0;
  const name = profile?.display_name || (session ? "트래블러" : "게스트");
  const maxR = version?.theoreticalRating ?? 17.886;
  const nt = nextTier(analysis.rating);
  const eff = analysis.best.map((b) => b.effective);
  const top = analysis.best.slice(0, 10);

  if (empty) {
    return (
      <div className="pop mx-auto max-w-xl pt-6 text-center">
        <div className="mx-auto mb-5 grid grid-cols-4 gap-1.5 opacity-90">
          {["suito", "heavens-cage", "uchronia", "aleph-0", "igallta", "angel-dust", "re-birth", "stage-5"].map((id) => (
            <Jacket key={id} songId={id} title={id} rounded="rounded-md" />
          ))}
        </div>
        <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.02em] sm:text-[36px]">점수를 넣으면 궤도가 돌기 시작해요</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-mist">
          한 곡씩 입력해도 되고, 쓰던 레이팅 시트나 TapTap 세이브를 통째로 가져와도 됩니다. B40·대상곡·완성도가 바로 계산돼요.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/scores" variant="primary">
            점수 입력하기
          </ButtonLink>
          <ButtonLink href="/import">시트·세이브 가져오기</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="pop">
      {/* profile banner */}
      <section className="relative overflow-hidden rounded-[22px] border border-line bg-paper/70 p-5 backdrop-blur sm:p-7">
        <div className="tier-glow pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full opacity-30 blur-3xl" style={tierStyle(analysis.rating)} aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[14px] text-mist">
              <span className="truncate font-semibold text-ink">{name}</span>
              <span>·</span>
              <span>{analysis.played.toLocaleString()}곡</span>
            </div>
            <div className="mt-1 flex items-end gap-3">
              <TierBadge rating={analysis.rating} size={56} className="mb-1 sm:h-[68px] sm:w-[68px]" />
              <RatingNumber rating={analysis.rating} className="text-[60px] font-bold leading-[0.9] tracking-[-0.03em] sm:text-[76px]" />
              <span className="mb-2 text-[13px] text-mist">
                이론치 {maxR.toFixed(3)}
                <br />
                <span className="text-ink-2">−{(maxR - analysis.rating).toFixed(3)}</span>
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill label="다음 +0.001" value={analysis.toNext.toFixed(6)} />
              {nt && <Pill label="다음 휘장" value={`${nt.min.toFixed(3)}까지 ${(nt.min - analysis.rating).toFixed(3)}`} />}
              <Pill label="완성도" value={fmtPercent(completion.percent)} />
              <Pill label="B40 AP+" value={`${analysis.apPlusInBest}개`} />
            </div>
          </div>
          <div className="flex gap-2">
            <ButtonLink href="/best" variant="primary">
              B40 전체
            </ButtonLink>
            <ButtonLink href="/targets">대상곡</ButtonLink>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-x-6 gap-y-3 border-t border-line pt-4 sm:max-w-md">
          <Mini label="B1–10" value={avg(eff.slice(0, 10)).toFixed(3)} />
          <Mini label="B11–20" value={avg(eff.slice(10, 20)).toFixed(3)} />
          <Mini label="B21–40" value={avg(eff.slice(20, 40)).toFixed(3)} />
        </div>
      </section>

      {/* top charts */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold">상위 10곡</h2>
          <Link href="/best" className="text-[13px] font-medium text-accent hover:underline">
            B40 전체 보기
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {top.map((r) => (
            <BestTile key={r.chart.id} r={r} />
          ))}
        </div>
      </section>

      {/* push suggestions */}
      {targets.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold">조금만 더 치면 오르는 곡</h2>
            <Link href="/targets" className="text-[13px] font-medium text-accent hover:underline">
              전체
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {targets.map((t) => (
              <SongButton key={t.chart.id} songId={t.chart.songId} label={t.chart.title} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-paper/70 p-2.5 pr-4 transition hover:border-line-2">
                <Jacket songId={t.chart.songId} title={t.chart.songTitle || t.chart.title} difficulty={t.chart.difficulty} rounded="rounded-lg" className="w-12" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{t.chart.title}</div>
                  <div className="num text-[12px] text-mist">
                    {fmtScore(t.current)} → {fmtScore(t.minScore)}
                  </div>
                </div>
                <DiffMark d={t.chart.difficulty} compact />
                <span className="num text-[15px] font-bold text-accent">+{t.need.toLocaleString()}</span>
              </SongButton>
            ))}
          </div>
        </section>
      )}

      {version && (
        <p className="mt-8 text-[12px] text-mist">
          곡 데이터 {version.version} · {version.chartCount.toLocaleString()}채보 · 곡을 누르면 곡 정보가 열려요 · 자켓·곡 정보 출처 Rotaeno 위키
        </p>
      )}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-[12px]">
      <span className="text-mist">{label}</span>
      <span className="num font-semibold text-ink">{value}</span>
    </span>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[12px] text-mist">{label} 평균</div>
      <div className="num text-[19px] font-semibold">{value}</div>
    </div>
  );
}
