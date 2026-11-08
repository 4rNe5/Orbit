"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { DiffMark, Loading, PageHeader, Panel, Segmented, Stat } from "@/components/ui";
import { fmtPercent, fmtScore } from "@/lib/format";

type View = "lowest" | "unplayed";

export default function CompletionPage() {
  const { ready, completion, scores } = useApp();
  const [view, setView] = useState<View>("lowest");

  const slots = useMemo(() => {
    if (!completion) return [];
    const counted = Object.values(completion.charts).filter((c) => c.counted);
    return counted
      .filter((c) => (view === "unplayed" ? c.value === 0 : c.value > 0 && c.value < 1))
      .sort((a, b) => (view === "unplayed" ? b.mainConstant - a.mainConstant : a.value - b.value || b.mainConstant - a.mainConstant))
      .slice(0, 60);
  }, [completion, view]);

  if (!ready || !completion) return <Loading />;
  const maxBand = Math.max(...completion.bands.map((b) => b.slots), 1);

  return (
    <div>
      <PageHeader
        title="완성도"
        lead="곡마다 IV(또는 가장 잘 친 I–IV 중 하나)와 IV-α가 각각 최대 1점입니다. 레이팅 비율, EX+ 보너스, FC·AP·AP+ 보너스로 점수가 정해지고, 낮은 난이도일수록 0.7–0.9배가 됩니다."
      />

      <Panel className="grid gap-6 p-5 sm:grid-cols-[1fr_2fr] sm:p-6">
        <div>
          <div className="text-[13px] text-mist">총 완성도</div>
          <div className="num mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em]">{fmtPercent(completion.percent)}</div>
          <div className="num mt-2 text-[13px] text-mist">
            {completion.total.toFixed(3)} / {completion.max}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-orbit" style={{ width: `${completion.percent * 100}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Stat label="채운 점수" value={completion.total.toFixed(3)} />
          <Stat label="남은 점수" value={(completion.max - completion.total).toFixed(3)} />
          <Stat label="최대 완성도" value={completion.max} hint="삭제곡을 뺀 IV와 IV-α 수" />
        </div>
      </Panel>

      <section className="mt-8">
        <h2 className="mb-3 text-[17px] font-semibold">난이도 구간별</h2>
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-mist">
                <th className="px-4 py-2.5 font-normal">구간</th>
                <th className="px-2 py-2.5 font-normal">채운 정도</th>
                <th className="px-2 py-2.5 text-right font-normal">곡 수</th>
                <th className="px-2 py-2.5 text-right font-normal">완성도</th>
                <th className="px-4 py-2.5 text-right font-normal">남은 양</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {completion.bands.map((b) => (
                <tr key={b.key}>
                  <td className="num px-4 py-3 font-semibold">{b.label}</td>
                  <td className="w-[40%] px-2 py-3">
                    <div className="h-2.5 rounded-full bg-line" style={{ width: `${(b.slots / maxBand) * 100}%`, minWidth: b.slots ? 8 : 0 }}>
                      <div className="h-full rounded-full bg-orbit" style={{ width: b.slots ? `${(b.total / b.slots) * 100}%` : 0 }} />
                    </div>
                  </td>
                  <td className="num px-2 py-3 text-right">{b.slots}</td>
                  <td className="num px-2 py-3 text-right">{b.total.toFixed(3)}</td>
                  <td className="num px-4 py-3 text-right text-mist">{b.gap.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold">{view === "lowest" ? "완성도가 낮은 곡" : "아직 안 친 곡"}</h2>
          <Segmented<View>
            label="목록"
            value={view}
            onChange={setView}
            options={[
              { value: "lowest", label: "낮은 순" },
              { value: "unplayed", label: "미플레이" },
            ]}
          />
        </div>
        <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          {slots.map((s) => (
            <li key={s.chart.id} className="flex items-center gap-3 px-4 py-2.5">
              <DiffMark d={s.chart.difficulty} constant={s.chart.constant} />
              <span className="min-w-0 flex-1 truncate text-[14px]">{s.chart.title}</span>
              <span className="num hidden text-[13px] text-mist sm:inline">{fmtScore(scores[s.chart.id]?.score)}</span>
              <span className="num w-16 text-right font-semibold">{s.value.toFixed(3)}</span>
            </li>
          ))}
          {slots.length === 0 && <li className="px-4 py-6 text-sm text-mist">해당하는 곡이 없습니다.</li>}
        </ol>
      </section>
    </div>
  );
}
