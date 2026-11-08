"use client";

import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { BestList } from "@/components/best-list";
import { OrbitChart } from "@/components/orbit-chart";
import { Button, ButtonLink, Empty, Loading, PageHeader, Panel, Stat } from "@/components/ui";
import { fmtRating } from "@/lib/format";

export default function BestPage() {
  const { ready, analysis, profile, version, toast } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  if (!ready || !analysis) return <Loading />;
  if (analysis.best.length === 0)
    return (
      <>
        <PageHeader title="B40" />
        <Empty title="아직 B40이 비어 있습니다" action={<ButtonLink href="/scores" variant="primary">점수 입력하기</ButtonLink>}>
          점수를 하나 이상 입력하면 레이팅이 높은 순서로 40개 채보가 채워집니다.
        </Empty>
      </>
    );

  const save = async () => {
    if (!ref.current) return;
    setSaving(true);
    try {
      const bg = getComputedStyle(document.body).backgroundColor;
      const url = await toPng(ref.current, { pixelRatio: 2, backgroundColor: bg, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `orbit-b40-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      toast("B40 이미지를 저장했습니다.");
    } catch (e) {
      toast(`이미지를 만들지 못했습니다. ${(e as Error).message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const d = analysis.distance;
  return (
    <div>
      <PageHeader
        title="B40"
        lead="레이팅은 B1–10 평균의 60%, B11–20 평균의 20%, B21–40 평균의 20%를 더한 값입니다. 같은 곡의 IV와 IV-α는 높은 쪽 하나만 들어갑니다."
        actions={
          <Button onClick={save} disabled={saving}>
            {saving ? "이미지 만드는 중" : "이미지로 저장"}
          </Button>
        }
      />

      <div ref={ref} className="flex flex-col gap-6 bg-sky p-1">
        <Panel className="grid items-center gap-6 p-5 sm:grid-cols-[220px_1fr]">
          <div className="mx-auto w-[220px]">
            <OrbitChart best={analysis.best} rating={analysis.rating} caption={profile?.display_name || "레이팅"} size={220} />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            <Stat label="다음 +0.001까지" value={analysis.toNext.toFixed(6)} />
            <Stat label="B40 중 AP+" value={`${analysis.apPlusInBest}개`} />
            <Stat label="1위 레이팅" value={fmtRating(analysis.pivots.r1, 4)} />
            <Stat label="B1–10 이론치까지" value={d.b10 === null ? "–" : `${d.b10.toLocaleString()}점`} />
            <Stat label="B11–20 이론치까지" value={d.b20 === null ? "–" : `${d.b20.toLocaleString()}점`} />
            <Stat label="B21–40 이론치까지" value={d.b40 === null ? "–" : `${d.b40.toLocaleString()}점`} />
          </div>
        </Panel>
        <BestList best={analysis.best} />
        <p className="text-right text-[11px] text-mist">
          Orbit Rating, 곡 데이터 {version?.version}, {new Date().toLocaleDateString("ko-KR")}
        </p>
      </div>
    </div>
  );
}
