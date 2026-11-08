"use client";

import { useEffect, useState } from "react";
import { useApp, type Snapshot } from "@/components/app-provider";
import { ButtonLink, Empty, Loading, PageHeader, Panel } from "@/components/ui";
import { fmtPercent, relTime } from "@/lib/format";

function RatingLine({ data }: { data: Snapshot[] }) {
  const W = 720;
  const H = 260;
  const pad = { l: 52, r: 16, t: 16, b: 32 };
  const t = data.map((d) => Date.parse(d.created_at));
  const v = data.map((d) => d.rating);
  const t0 = Math.min(...t);
  const t1 = Math.max(...t);
  const lo = Math.floor((Math.min(...v) - 0.005) * 100) / 100;
  const hi = Math.ceil((Math.max(...v) + 0.005) * 100) / 100;
  const X = (x: number) => pad.l + (t1 === t0 ? 0.5 : (x - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const Y = (y: number) => pad.t + (1 - (y - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  const path = data.map((d, i) => `${i ? "L" : "M"}${X(t[i]).toFixed(1)} ${Y(d.rating).toFixed(1)}`).join(" ");
  const fmtDay = (ms: number) => {
    const d = new Date(ms);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="레이팅 추이">
      {ticks.map((y) => (
        <g key={y}>
          <line x1={pad.l} x2={W - pad.r} y1={Y(y)} y2={Y(y)} stroke="var(--line)" />
          <text x={pad.l - 8} y={Y(y) + 4} textAnchor="end" fontSize="11" fill="var(--mist)" className="num">
            {y.toFixed(2)}
          </text>
        </g>
      ))}
      <text x={pad.l} y={H - 8} fontSize="11" fill="var(--mist)">
        {fmtDay(t0)}
      </text>
      <text x={W - pad.r} y={H - 8} textAnchor="end" fontSize="11" fill="var(--mist)">
        {fmtDay(t1)}
      </text>
      <path d={path} fill="none" stroke="var(--orbit)" strokeWidth="2.2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={X(t[i])} cy={Y(d.rating)} r={i === data.length - 1 ? 4.5 : 2.5} fill={i === data.length - 1 ? "var(--orbit)" : "var(--paper)"} stroke="var(--orbit)" strokeWidth="1.5">
          <title>{`${relTime(d.created_at)}  ${d.rating.toFixed(3)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function HistoryPage() {
  const { ready, snapshots, session, analysis } = useApp();
  const [data, setData] = useState<Snapshot[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    snapshots().then(setData).catch(() => setData([]));
  }, [ready, snapshots, analysis?.rating]);

  if (!ready || data === null) return <Loading />;

  return (
    <div>
      <PageHeader
        title="레이팅 기록"
        lead={`점수를 바꾸고 레이팅이 달라지면 몇 초 뒤 자동으로 기록됩니다. ${session ? "계정에 저장됩니다." : "로그인 전 기록은 이 기기에만 남습니다."}`}
      />
      {data.length < 2 ? (
        <Empty title="기록이 두 개 이상 쌓이면 그래프가 그려집니다" action={<ButtonLink href="/scores">점수 입력하기</ButtonLink>}>
          지금까지 {data.length}개 기록이 있습니다.
        </Empty>
      ) : (
        <>
          <Panel className="p-4 sm:p-6">
            <RatingLine data={data} />
          </Panel>
          <h2 className="mb-2 mt-8 text-[17px] font-semibold">변화</h2>
          <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
            {[...data]
              .reverse()
              .slice(0, 100)
              .map((d, i, arr) => {
                const prev = arr[i + 1];
                const delta = prev ? d.rating - prev.rating : null;
                return (
                  <li key={d.created_at} className="flex items-center gap-4 px-4 py-2.5 text-[14px]">
                    <span className="num w-36 text-[13px] text-mist">{relTime(d.created_at)}</span>
                    <span className="num font-semibold">{d.rating.toFixed(3)}</span>
                    {delta !== null && (
                      <span className={`num text-[13px] ${delta > 0 ? "text-ok" : delta < 0 ? "text-danger" : "text-mist"}`}>
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(3)}
                      </span>
                    )}
                    <span className="ml-auto text-[12px] text-mist">
                      {d.played}채보{d.completion_percent !== null && `, 완성도 ${fmtPercent(d.completion_percent)}`}
                    </span>
                  </li>
                );
              })}
          </ol>
        </>
      )}
    </div>
  );
}
