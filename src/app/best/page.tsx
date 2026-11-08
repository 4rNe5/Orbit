"use client";

import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { BestTile } from "@/components/best-tile";
import { ShareCard } from "@/components/share-card";
import { Button, ButtonLink, Empty, Loading, PageHeader } from "@/components/ui";
import { fmtRating } from "@/lib/format";

const GROUPS = [
  { title: "B1–10", sub: "레이팅의 60%", from: 0, to: 10 },
  { title: "B11–20", sub: "20%", from: 10, to: 20 },
  { title: "B21–40", sub: "20%", from: 20, to: 40 },
];

export default function BestPage() {
  const { ready, analysis, completion, profile, version, toast } = useApp();
  const shareRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  if (!ready || !analysis || !completion) return <Loading />;
  if (analysis.best.length === 0)
    return (
      <>
        <PageHeader title="B40" />
        <Empty title="아직 B40이 비어 있어요" action={<ButtonLink href="/scores" variant="primary">점수 입력하기</ButtonLink>}>
          점수를 하나라도 넣으면 레이팅이 높은 순으로 40곡이 채워집니다.
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
      const url = await toPng(shareRef.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `orbit-b40-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      toast("B40 이미지를 저장했어요.");
    } catch (e) {
      toast(`이미지를 만들지 못했어요. ${(e as Error).message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const d = analysis.distance;
  return (
    <div>
      <PageHeader
        title="B40"
        lead="레이팅 = B1–10 평균×0.6 + B11–20 평균×0.2 + B21–40 평균×0.2. 같은 곡의 IV·IV-α는 높은 쪽만 들어가요."
        actions={
          <Button onClick={save} disabled={saving} variant="primary">
            {saving ? "만드는 중…" : "이미지로 저장"}
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-line bg-paper/70 px-5 py-4 text-[13px]">
        <Fact label="다음 +0.001까지" value={analysis.toNext.toFixed(6)} />
        <Fact label="1위" value={fmtRating(analysis.pivots.r1, 3)} />
        <Fact label="B1–10 이론치까지" value={d.b10 === null ? "–" : `${d.b10.toLocaleString()}점`} />
        <Fact label="B11–20" value={d.b20 === null ? "–" : `${d.b20.toLocaleString()}점`} />
        <Fact label="B21–40" value={d.b40 === null ? "–" : `${d.b40.toLocaleString()}점`} />
      </div>

      <div className="flex flex-col gap-8">
        {GROUPS.map((g) => {
          const items = analysis.best.slice(g.from, g.to);
          if (!items.length) return null;
          return (
            <section key={g.title}>
              <h2 className="mb-3 flex items-baseline gap-2">
                <span className="font-display text-[18px] font-bold">{g.title}</span>
                <span className="text-[12px] text-mist">{g.sub}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {items.map((r) => (
                  <BestTile key={r.chart.id} r={r} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* off-screen export target */}
      <div className="pointer-events-none fixed left-[-99999px] top-0" aria-hidden>
        <div ref={shareRef}>
          <ShareCard
            best={analysis.best}
            rating={analysis.rating}
            completion={completion.percent}
            name={profile?.display_name || "트래블러"}
            version={version?.version ?? ""}
            date={new Date().toLocaleDateString("ko-KR")}
          />
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-mist">{label}</span>
      <span className="num font-semibold text-ink">{value}</span>
    </span>
  );
}
