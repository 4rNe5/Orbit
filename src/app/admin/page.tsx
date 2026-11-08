"use client";

import { useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Button, DiffMark, Empty, Loading, PageHeader, Panel } from "@/components/ui";
import { indexCharts, theoreticalRating } from "@/lib/core/rating";
import type { Chart } from "@/lib/core/types";
import { chartToRow } from "@/lib/data/charts";
import { readMasterSheet, type MasterImport, type SheetTable } from "@/lib/sheet";
import { supabase } from "@/lib/supabase";

interface Diff {
  added: Chart[];
  constant: { chart: Chart; from: number }[];
  deletedFlag: Chart[];
  renamed: { chart: Chart; from: string }[];
  theoretical: number;
}

function diffOf(current: Chart[], next: Chart[]): Diff {
  const cur = new Map(current.map((c) => [c.id, c]));
  const d: Diff = { added: [], constant: [], deletedFlag: [], renamed: [], theoretical: theoreticalRating(indexCharts(next)) };
  for (const c of next) {
    const o = cur.get(c.id);
    if (!o) d.added.push(c);
    else {
      if (o.constant !== c.constant) d.constant.push({ chart: c, from: o.constant });
      if (o.deleted !== c.deleted) d.deletedFlag.push(c);
      if (o.title !== c.title) d.renamed.push({ chart: c, from: o.title });
    }
  }
  return d;
}

export default function AdminPage() {
  const { ready, isAdmin, charts, version, toast } = useApp();
  const [data, setData] = useState<{ master: MasterImport; diff: Diff } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  if (!ready) return <Loading />;
  if (!isAdmin)
    return (
      <>
        <PageHeader title="곡 데이터 관리" />
        <Empty title="관리자만 쓸 수 있는 화면입니다">
          Supabase SQL 편집기에서 관리자 계정의 app_metadata에 role을 admin으로 넣은 뒤 다시 로그인하세요. 저장소 README의 「관리자 지정」 항목에 SQL이 있습니다.
        </Empty>
      </>
    );

  const onFile = async (f: File) => {
    setBusy("파일을 읽는 중");
    try {
      const { default: readXlsx } = await import("read-excel-file/browser");
      const master = readMasterSheet((await readXlsx(f)) as unknown as SheetTable[]);
      setData({ master, diff: diffOf(charts, master.charts) });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const apply = async () => {
    if (!data) return;
    const { master, diff } = data;
    const sb = supabase();
    try {
      setBusy("버전 기록 중");
      const songCount = new Set(master.charts.map((c) => c.songId)).size;
      let r = await sb.from("data_versions").upsert(
        { version: master.version, chart_count: master.charts.length, song_count: songCount, theoretical_rating: diff.theoretical, source: "Rotaeno 新时代Rating分析表 (Artis+)", is_current: master.version === version?.version },
        { onConflict: "version" },
      );
      if (r.error) throw r.error;
      for (let i = 0; i < master.charts.length; i += 500) {
        setBusy(`채보 저장 중 ${Math.min(i + 500, master.charts.length)}/${master.charts.length}`);
        r = await sb.from("charts").upsert(master.charts.slice(i, i + 500).map((c) => chartToRow(c, master.version)), { onConflict: "id" });
        if (r.error) throw r.error;
      }
      if (master.history) {
        r = await sb.from("app_meta").upsert({ key: "constant_history", value: master.history, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (r.error) throw r.error;
      }
      if (master.version !== version?.version) {
        setBusy("현재 버전 전환 중");
        r = await sb.from("data_versions").update({ is_current: false }).eq("is_current", true);
        if (r.error) throw r.error;
        r = await sb.from("data_versions").update({ is_current: true }).eq("version", master.version);
        if (r.error) throw r.error;
      }
      try {
        localStorage.removeItem("orbit:charts:v1");
      } catch {
        /* ignore */
      }
      toast(`${master.version} 곡 데이터를 반영했습니다. 새로고침합니다.`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast(`반영하지 못했습니다. ${(e as { message: string }).message}`, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="곡 데이터 관리"
        lead={`지금 곡 데이터는 ${version?.version}, ${version?.chartCount.toLocaleString()}채보입니다. 새 버전 레이팅 분석표(xlsx)를 올리면 바뀐 점을 먼저 보여 주고, 확인하면 모든 사용자에게 반영합니다.`}
      />
      <Panel className="p-5 sm:p-6">
        <input ref={input} type="file" accept=".xlsx" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <Button onClick={() => input.current?.click()} disabled={!!busy}>
          분석표 xlsx 고르기
        </Button>
        {busy && <p className="mt-3 text-[13px] text-mist">{busy}</p>}
        {data && (
          <div className="mt-5">
            <h2 className="text-[17px] font-semibold">
              {data.master.version} 분석표: {data.master.charts.length.toLocaleString()}채보
            </h2>
            <p className="mt-1 text-[13px] text-mist">
              계산한 이론 최대 {data.diff.theoretical.toFixed(3)}, 분석표 표기 {data.master.theoretical ?? "–"}. 새 채보 {data.diff.added.length}개, 정수 변경 {data.diff.constant.length}개, 삭제 표시 변경 {data.diff.deletedFlag.length}개, 제목 변경 {data.diff.renamed.length}개.
            </p>
            {data.diff.constant.length > 0 && (
              <ul className="mt-3 max-h-72 divide-y divide-line overflow-auto rounded-[12px] border border-line">
                {data.diff.constant.map(({ chart, from }) => (
                  <li key={chart.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                    <DiffMark d={chart.difficulty} compact />
                    <span className="min-w-0 flex-1 truncate">{chart.title}</span>
                    <span className="num">
                      {from.toFixed(1)} → {chart.constant.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {data.diff.added.length > 0 && (
              <details className="mt-3 text-[13px]">
                <summary className="cursor-pointer font-medium">새 채보 {data.diff.added.length}개</summary>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {data.diff.added.map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <DiffMark d={c.difficulty} constant={c.constant} />
                      <span className="truncate">{c.title}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={apply} disabled={!!busy}>
                모든 사용자에게 반영
              </Button>
              <Button variant="ghost" onClick={() => setData(null)} disabled={!!busy}>
                취소
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
