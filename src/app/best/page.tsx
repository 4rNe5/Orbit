"use client";

import { toJpeg } from "html-to-image";
import { useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { BestTile } from "@/components/best-tile";
import { ShareCard } from "@/components/share-card";
import { Button, ButtonLink, Empty, Loading, PageHeader } from "@/components/ui";
import { fmtRating } from "@/lib/format";
import { defineDict, useLocale, useT } from "@/lib/i18n";

const T = defineDict({
  ko: {
    share60: "레이팅의 60%",
    share20: "20%",
    emptyTitle: "아직 B40이 비어 있어요",
    enterScores: "점수 입력하기",
    emptyBody: "점수를 하나라도 넣으면 레이팅이 높은 순으로 40곡이 채워집니다.",
    saved: "B40 이미지를 저장했어요.",
    saveFailed: "이미지를 만들지 못했어요. {msg}",
    lead: "레이팅 = B1–10 평균×0.6 + B11–20 평균×0.2 + B21–40 평균×0.2. 같은 곡의 IV·IV-α는 높은 쪽만 들어가요.",
    making: "만드는 중…",
    saveImage: "이미지로 저장",
    toNext: "다음 +0.001까지",
    first: "1위",
    b10ToTheory: "B1–10 이론치까지",
    points: "{n}점",
    traveler: "트래블러",
  },
  ja: {
    share60: "レートの60%",
    share20: "20%",
    emptyTitle: "B40はまだ空です",
    enterScores: "スコアを入力",
    emptyBody: "スコアを1つでも入れると、レートの高い順に40曲が埋まります。",
    saved: "B40の画像を保存しました。",
    saveFailed: "画像を作成できませんでした。{msg}",
    lead: "レート = B1–10平均×0.6 + B11–20平均×0.2 + B21–40平均×0.2。同じ曲のIV・IV-αは高いほうだけが入ります。",
    making: "作成中…",
    saveImage: "画像で保存",
    toNext: "次の+0.001まで",
    first: "1位",
    b10ToTheory: "B1–10 理論値まで",
    points: "{n}点",
    traveler: "トラベラー",
  },
  zh: {
    share60: "占 Rating 的 60%",
    share20: "20%",
    emptyTitle: "B40 还是空的",
    enterScores: "录入分数",
    emptyBody: "只要录入一个分数，就会按 Rating 从高到低填满 40 首。",
    saved: "已保存 B40 图片。",
    saveFailed: "图片生成失败。{msg}",
    lead: "Rating = B1–10 平均×0.6 + B11–20 平均×0.2 + B21–40 平均×0.2。同一曲目的 IV 与 IV-α 只计入较高的一个。",
    making: "生成中…",
    saveImage: "保存为图片",
    toNext: "距下一个+0.001",
    first: "第1名",
    b10ToTheory: "B1–10 距理论值",
    points: "{n} 分",
    traveler: "旅行者",
  },
});

const DATE_LOCALE = { ko: "ko-KR", ja: "ja-JP", zh: "zh-CN" } as const;

const GROUPS = [
  { title: "B1–10", sub: "share60", from: 0, to: 10 },
  { title: "B11–20", sub: "share20", from: 10, to: 20 },
  { title: "B21–40", sub: "share20", from: 20, to: 40 },
] as const;

export default function BestPage() {
  const { ready, analysis, completion, profile, version, toast } = useApp();
  const shareRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const t = useT(T);
  const locale = useLocale();

  if (!ready || !analysis || !completion) return <Loading />;
  if (analysis.best.length === 0)
    return (
      <>
        <PageHeader title="B40" />
        <Empty title={t("emptyTitle")} action={<ButtonLink href="/scores" variant="primary">{t("enterScores")}</ButtonLink>}>
          {t("emptyBody")}
        </Empty>
      </>
    );

  const save = async () => {
    if (!shareRef.current) return;
    setSaving(true);
    try {
      // wait for jacket <img>s inside the card to finish loading
      await Promise.all(
        Array.from(shareRef.current.querySelectorAll("img")).map(
          (img) => img.complete || new Promise((res) => { img.onload = img.onerror = res; }),
        ),
      );
      // JPEG keeps the 3840px image well under the 5 MB most social sites accept (PNG was ~7 MB)
      const url = await toJpeg(shareRef.current, { pixelRatio: 2, quality: 0.92, cacheBust: true, backgroundColor: "#060a14" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `orbit-b40-${new Date().toISOString().slice(0, 10)}.jpg`;
      a.click();
      toast(t("saved"));
    } catch (e) {
      toast(t("saveFailed", { msg: (e as Error).message }), "error");
    } finally {
      setSaving(false);
    }
  };

  const d = analysis.distance;
  return (
    <div>
      <PageHeader
        title="B40"
        help={t("lead")}
        actions={
          <Button onClick={save} disabled={saving} variant="primary">
            {saving ? t("making") : t("saveImage")}
          </Button>
        }
      />

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
        {/* facts: a wrapped line on small screens, a sticky column on wide ones */}
        <aside className="mb-6 lg:mb-0">
          <dl className="flex flex-wrap gap-x-6 gap-y-2 rounded-[var(--radius-panel)] border border-line bg-paper px-4 py-3 text-[13px] lg:sticky lg:top-20 lg:flex-col lg:gap-y-3.5 lg:px-5 lg:py-4">
            <Fact label={t("toNext")} value={analysis.toNext.toFixed(6)} />
            <Fact label={t("first")} value={fmtRating(analysis.pivots.r1, 3)} />
            <Fact label={t("b10ToTheory")} value={d.b10 === null ? "–" : t("points", { n: d.b10.toLocaleString() })} />
            <Fact label="B11–20" value={d.b20 === null ? "–" : t("points", { n: d.b20.toLocaleString() })} />
            <Fact label="B21–40" value={d.b40 === null ? "–" : t("points", { n: d.b40.toLocaleString() })} />
          </dl>
        </aside>

      <div className="flex min-w-0 flex-col gap-8">
        {GROUPS.map((g) => {
          const items = analysis.best.slice(g.from, g.to);
          if (!items.length) return null;
          return (
            <section key={g.title}>
              <h2 className="mb-3 flex items-baseline gap-2">
                <span className="font-display text-[16px] font-bold">{g.title}</span>
                <span className="text-[12px] text-mist">{t(g.sub)}</span>
              </h2>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                {items.map((r) => (
                  <BestTile key={r.chart.id} r={r} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      </div>

      {/* off-screen export target */}
      <div className="pointer-events-none fixed left-[-99999px] top-0" aria-hidden>
        <div ref={shareRef}>
          <ShareCard
            best={analysis.best}
            rating={analysis.rating}
            completion={completion.percent}
            name={profile?.display_name || t("traveler")}
            version={version?.version ?? ""}
            date={new Date().toLocaleDateString(DATE_LOCALE[locale])}
            toNext={analysis.toNext}
            theoretical={version?.theoreticalRating ?? null}
          />
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 lg:flex-col lg:gap-0.5">
      <dt className="text-mist">{label}</dt>
      <dd className="num font-semibold text-ink lg:text-[15px]">{value}</dd>
    </div>
  );
}
