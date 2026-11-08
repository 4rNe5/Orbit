"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { normalize } from "@/components/chart-filter";
import { Button, Chip, DiffMark, Loading, PageHeader, Panel, Segmented, TextInput } from "@/components/ui";
import { DIFFICULTIES, type Chart, type Difficulty } from "@/lib/core/types";
import { loadConstantHistory, type ConstantHistory } from "@/lib/data/charts";
import { diffClass, fmtScore } from "@/lib/format";
import { packName } from "@/lib/packs";

type Tab = "random" | "challenge" | "history";

function sample<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function Reveal({ chart, score, k }: { chart: Chart; score: number | null; k: number }) {
  return (
    <div key={k} className={`${diffClass(chart.difficulty)} flex items-center gap-5`}>
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden className="shrink-0">
        <circle cx="44" cy="44" r="36" fill="none" stroke="var(--line)" strokeWidth="8" />
        <path d="M44 8 A36 36 0 0 1 80 44" fill="none" stroke="var(--diff)" strokeWidth="8" strokeLinecap="round" className="orbit-ring" />
        <text x="44" y="50" textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--ink)" className="num">
          {chart.constant.toFixed(1)}
        </text>
      </svg>
      <div className="min-w-0">
        <DiffMark d={chart.difficulty} compact />
        <div className="mt-1 text-[22px] font-semibold leading-tight">{chart.title}</div>
        <div className="mt-1 text-[13px] text-mist">
          {packName(chart.pack)}, {score === null ? "미플레이" : `현재 ${fmtScore(score)}`}
        </div>
      </div>
    </div>
  );
}

function RandomTool() {
  const { charts, scores } = useApp();
  const [min, setMin] = useState("13");
  const [max, setMax] = useState("13.9");
  const [diffs, setDiffs] = useState<Difficulty[]>([]);
  const [picked, setPicked] = useState<{ chart: Chart; k: number } | null>(null);
  const pool = charts.filter(
    (c) => !c.deleted && c.constant >= Number(min || 0) && c.constant <= Number(max || 99) && (diffs.length === 0 || diffs.includes(c.difficulty)),
  );
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[13px] text-mist">
          정수 하한
          <TextInput inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value.replace(/[^0-9.]/g, ""))} className="num w-24" />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-mist">
          정수 상한
          <TextInput inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value.replace(/[^0-9.]/g, ""))} className="num w-24" />
        </label>
        <Button variant="primary" disabled={!pool.length} onClick={() => setPicked({ chart: pool[Math.floor(Math.random() * pool.length)], k: Date.now() })}>
          한 곡 뽑기
        </Button>
        <span className="text-[13px] text-mist">{pool.length}개 채보 중</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {DIFFICULTIES.map((d) => (
          <Chip key={d} active={diffs.includes(d)} onClick={() => setDiffs((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]))}>
            {d}
          </Chip>
        ))}
      </div>
      {picked && (
        <div className="mt-6 border-t border-line pt-6">
          <Reveal chart={picked.chart} score={scores[picked.chart.id]?.score ?? null} k={picked.k} />
        </div>
      )}
    </Panel>
  );
}

const MODES = [
  { key: "1", label: "1단", min: 11, max: 11.9, hp: 300, heal: 50 },
  { key: "2", label: "2단", min: 12, max: 12.9, hp: 200, heal: 30 },
  { key: "3", label: "3단", min: 13, max: 13.9, hp: 100, heal: 20 },
  { key: "4", label: "4단", min: 14, max: 99, hp: 50, heal: 5 },
] as const;

function ChallengeTool() {
  const { charts } = useApp();
  const [mode, setMode] = useState<(typeof MODES)[number]["key"]>("3");
  const [tracks, setTracks] = useState<Chart[]>([]);
  const [judge, setJudge] = useState<{ p: string; g: string; m: string }[]>([]);
  const m = MODES.find((x) => x.key === mode)!;

  const draw = () => {
    const pool = charts.filter((c) => !c.deleted && c.constant >= m.min && c.constant <= m.max);
    setTracks(sample(pool, 4));
    setJudge(Array.from({ length: 4 }, () => ({ p: "", g: "", m: "" })));
  };

  // HP after each track: lose Perfect×1 + Good×5 + Miss×10, then heal before the next track (never above max).
  const hp: { before: number; after: number; failed: boolean }[] = [];
  let cur: number = m.hp;
  let failed = false;
  for (let i = 0; i < tracks.length; i++) {
    const j = judge[i] ?? { p: "", g: "", m: "" };
    const before = cur;
    if (j.p === "" && j.g === "" && j.m === "") break;
    const after = before - (Number(j.p || 0) + 5 * Number(j.g || 0) + 10 * Number(j.m || 0));
    hp.push({ before, after, failed: after <= 0 });
    if (after <= 0) {
      failed = true;
      break;
    }
    cur = Math.min(m.hp, after + m.heal);
  }
  const cleared = !failed && hp.length === 4;

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="단계" value={mode} onChange={(v) => { setMode(v); setTracks([]); }} options={MODES.map((x) => ({ value: x.key, label: x.label }))} />
        <Button variant="primary" onClick={draw}>
          4곡 뽑기
        </Button>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-mist">
        정수 {m.min}–{m.max === 99 ? "" : m.max}, 최대 체력 {m.hp}, 곡 사이 회복 +{m.heal}. Perfect −1, Good −5, Miss −10. 재시도 없이 순서대로 치고, 체력이 0이 되면 실패입니다.
      </p>
      {tracks.length > 0 && (
        <ol className="mt-5 divide-y divide-line rounded-[12px] border border-line">
          {tracks.map((c, i) => {
            const h = hp[i];
            const set = (k: "p" | "g" | "m", v: string) => setJudge((arr) => arr.map((x, idx) => (idx === i ? { ...x, [k]: v.replace(/[^0-9]/g, "") } : x)));
            return (
              <li key={c.id} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="num w-6 text-mist">{i + 1}</span>
                  <div className="min-w-0">
                    <DiffMark d={c.difficulty} constant={c.constant} />
                    <div className="truncate text-[14px] font-medium">{c.title}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-9 sm:pl-0">
                  {(["p", "g", "m"] as const).map((k) => (
                    <TextInput
                      key={k}
                      inputMode="numeric"
                      aria-label={`${i + 1}번 곡 ${k === "p" ? "Perfect" : k === "g" ? "Good" : "Miss"}`}
                      placeholder={k === "p" ? "Perfect" : k === "g" ? "Good" : "Miss"}
                      value={judge[i]?.[k] ?? ""}
                      onChange={(e) => set(k, e.target.value)}
                      className="num h-9 w-20 text-center"
                    />
                  ))}
                  <span className={`num w-20 text-right text-[14px] font-semibold ${h?.failed ? "text-danger" : ""}`}>{h ? `${h.before}→${Math.max(0, h.after)}` : ""}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {(failed || cleared) && (
        <p className={`mt-4 text-[15px] font-semibold ${failed ? "text-danger" : "text-ok"}`}>
          {failed ? `${hp.length}번째 곡에서 체력이 바닥났습니다.` : `통과했습니다. 남은 체력 ${hp[3].after}.`}
        </p>
      )}
    </Panel>
  );
}

function HistoryTool() {
  const [data, setData] = useState<ConstantHistory | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    loadConstantHistory().then(setData).catch(() => setData({ eras: [], rows: [] }));
  }, []);
  const rows = useMemo(() => (data ? data.rows.filter((r) => !q || normalize(r.title).includes(normalize(q))) : []), [data, q]);
  if (!data) return <Loading />;
  const eraLabel = (e: string) => e.replace(/前定数.*$/, " 이전").replace("现版本定数", "현재");
  return (
    <Panel className="p-4 sm:p-5">
      <p className="text-[13px] leading-relaxed text-mist">정수가 크게 바뀐 업데이트 직전의 IV·IV-α 정수입니다. 비어 있는 칸은 그 시점에 없던 곡입니다.</p>
      <TextInput type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="곡 제목으로 검색" aria-label="곡 검색" className="mt-3 w-full max-w-sm" />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-mist">
              <th className="py-2 pr-3 font-normal">곡</th>
              <th className="px-2 py-2 font-normal">난이도</th>
              {data.eras.map((e) => (
                <th key={e} className="px-2 py-2 text-right font-normal">
                  {eraLabel(e)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.slice(0, 200).map((r) => {
              const vals = r.values;
              return (
                <tr key={`${r.title}-${r.difficulty}`}>
                  <td className="max-w-[16rem] truncate py-2 pr-3">{r.title}</td>
                  <td className="px-2 py-2">
                    <DiffMark d={r.difficulty as Difficulty} compact />
                  </td>
                  {vals.map((v, i) => {
                    const prev = vals.slice(0, i).reverse().find((x) => x !== null);
                    const changed = v !== null && prev !== undefined && prev !== null && v !== prev;
                    return (
                      <td key={i} className={`num px-2 py-2 text-right ${changed ? "font-semibold text-ink" : "text-mist"}`}>
                        {v === null ? "" : v.toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 200 && <p className="mt-3 text-[12px] text-mist">200개까지 보여 줍니다. 검색으로 좁혀 보세요.</p>}
    </Panel>
  );
}

export default function ToolsPage() {
  const { ready } = useApp();
  const [tab, setTab] = useState<Tab>("random");
  if (!ready) return <Loading />;
  return (
    <div>
      <PageHeader
        title="도구"
        actions={
          <Segmented<Tab>
            label="도구"
            value={tab}
            onChange={setTab}
            options={[
              { value: "random", label: "랜덤 곡" },
              { value: "challenge", label: "랜덤 챌린지" },
              { value: "history", label: "정수 연대기" },
            ]}
          />
        }
      />
      {tab === "random" && <RandomTool />}
      {tab === "challenge" && <ChallengeTool />}
      {tab === "history" && <HistoryTool />}
    </div>
  );
}
