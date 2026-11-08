"use client";

import { useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Button, DiffMark, Empty, Loading, PageHeader, Panel } from "@/components/ui";
import { indexCharts, theoreticalRating } from "@/lib/core/rating";
import type { Chart } from "@/lib/core/types";
import { chartToRow } from "@/lib/data/charts";
import { defineDict, useT } from "@/lib/i18n";
import { readMasterSheet, type MasterImport, type SheetTable } from "@/lib/sheet";
import { supabase } from "@/lib/supabase";

const T = defineDict({
  ko: {
    title: "곡 데이터 관리",
    adminOnly: "관리자만 쓸 수 있는 화면입니다",
    adminHowTo:
      "Supabase SQL 편집기에서 관리자 계정의 app_metadata에 role을 admin으로 넣은 뒤 다시 로그인하세요. 저장소 README의 「관리자 지정」 항목에 SQL이 있습니다.",
    readingFile: "파일을 읽는 중",
    recordingVersion: "버전 기록 중",
    savingCharts: "채보 저장 중 {done}/{total}",
    switchingVersion: "현재 버전 전환 중",
    applied: "{version} 곡 데이터를 반영했습니다. 새로고침합니다.",
    applyFailed: "반영하지 못했습니다. {msg}",
    lead: "지금 곡 데이터는 {version}, {n}채보입니다. 새 버전 레이팅 분석표(xlsx)를 올리면 바뀐 점을 먼저 보여 주고, 확인하면 모든 사용자에게 반영합니다.",
    pickXlsx: "분석표 xlsx 고르기",
    sheetHeading: "{version} 분석표: {n}채보",
    summary:
      "계산한 이론 최대 {calc}, 분석표 표기 {sheet}. 새 채보 {added}개, 정수 변경 {constant}개, 삭제 표시 변경 {deleted}개, 제목 변경 {renamed}개.",
    newCharts: "새 채보 {n}개",
    applyAll: "모든 사용자에게 반영",
    cancel: "취소",
  },
  ja: {
    title: "楽曲データ管理",
    adminOnly: "管理者専用の画面です",
    adminHowTo:
      "Supabase の SQL エディタで管理者アカウントの app_metadata に role を admin として設定し、再度ログインしてください。SQL はリポジトリの README の「管理者指定」の項目にあります。",
    readingFile: "ファイルを読み込み中",
    recordingVersion: "バージョンを記録中",
    savingCharts: "譜面を保存中 {done}/{total}",
    switchingVersion: "現在のバージョンを切り替え中",
    applied: "{version} の楽曲データを反映しました。再読み込みします。",
    applyFailed: "反映できませんでした。{msg}",
    lead: "現在の楽曲データは {version}、{n}譜面です。新しいバージョンのレート分析表(xlsx)をアップロードすると変更点を先に表示し、確認するとすべてのユーザーに反映します。",
    pickXlsx: "分析表 xlsx を選択",
    sheetHeading: "{version} 分析表：{n}譜面",
    summary:
      "計算上の理論最大値 {calc}、分析表の表記 {sheet}。新規譜面 {added}件、定数変更 {constant}件、削除フラグ変更 {deleted}件、タイトル変更 {renamed}件。",
    newCharts: "新規譜面 {n}件",
    applyAll: "すべてのユーザーに反映",
    cancel: "キャンセル",
  },
  zh: {
    title: "曲目数据管理",
    adminOnly: "此页面仅限管理员使用",
    adminHowTo:
      "请在 Supabase SQL 编辑器中将管理员账号 app_metadata 的 role 设为 admin，然后重新登录。所需 SQL 见仓库 README 的「指定管理员」一节。",
    readingFile: "正在读取文件",
    recordingVersion: "正在记录版本",
    savingCharts: "正在保存谱面 {done}/{total}",
    switchingVersion: "正在切换当前版本",
    applied: "已应用 {version} 曲目数据，即将刷新。",
    applyFailed: "应用失败。{msg}",
    lead: "当前曲目数据为 {version}，共 {n} 个谱面。上传新版本的 Rating 分析表(xlsx)后会先显示变更内容，确认后将应用到所有用户。",
    pickXlsx: "选择分析表 xlsx",
    sheetHeading: "{version} 分析表：{n} 个谱面",
    summary:
      "计算得出的理论最大值 {calc}，分析表标注 {sheet}。新增谱面 {added} 个，定数变更 {constant} 个，下架标记变更 {deleted} 个，标题变更 {renamed} 个。",
    newCharts: "新增谱面 {n} 个",
    applyAll: "应用到所有用户",
    cancel: "取消",
  },
});

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
  const t = useT(T);
  const [data, setData] = useState<{ master: MasterImport; diff: Diff } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  if (!ready) return <Loading />;
  if (!isAdmin)
    return (
      <>
        <PageHeader title={t("title")} />
        <Empty title={t("adminOnly")}>{t("adminHowTo")}</Empty>
      </>
    );

  const onFile = async (f: File) => {
    setBusy(t("readingFile"));
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
      setBusy(t("recordingVersion"));
      const songCount = new Set(master.charts.map((c) => c.songId)).size;
      let r = await sb.from("data_versions").upsert(
        { version: master.version, chart_count: master.charts.length, song_count: songCount, theoretical_rating: diff.theoretical, source: "Rotaeno 新时代Rating分析表 (Artis+)", is_current: master.version === version?.version },
        { onConflict: "version" },
      );
      if (r.error) throw r.error;
      for (let i = 0; i < master.charts.length; i += 500) {
        setBusy(t("savingCharts", { done: Math.min(i + 500, master.charts.length), total: master.charts.length }));
        r = await sb.from("charts").upsert(master.charts.slice(i, i + 500).map((c) => chartToRow(c, master.version)), { onConflict: "id" });
        if (r.error) throw r.error;
      }
      if (master.history) {
        r = await sb.from("app_meta").upsert({ key: "constant_history", value: master.history, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (r.error) throw r.error;
      }
      if (master.version !== version?.version) {
        setBusy(t("switchingVersion"));
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
      toast(t("applied", { version: master.version }));
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast(t("applyFailed", { msg: (e as { message: string }).message }), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("title")}
        lead={t("lead", { version: String(version?.version), n: String(version?.chartCount.toLocaleString()) })}
      />
      <Panel className="p-5 sm:p-6">
        <input ref={input} type="file" accept=".xlsx" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <Button onClick={() => input.current?.click()} disabled={!!busy}>
          {t("pickXlsx")}
        </Button>
        {busy && <p className="mt-3 text-[13px] text-mist">{busy}</p>}
        {data && (
          <div className="mt-5">
            <h2 className="text-[17px] font-semibold">{t("sheetHeading", { version: data.master.version, n: data.master.charts.length.toLocaleString() })}</h2>
            <p className="mt-1 text-[13px] text-mist">
              {t("summary", {
                calc: data.diff.theoretical.toFixed(3),
                sheet: data.master.theoretical ?? "–",
                added: data.diff.added.length,
                constant: data.diff.constant.length,
                deleted: data.diff.deletedFlag.length,
                renamed: data.diff.renamed.length,
              })}
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
                <summary className="cursor-pointer font-medium">{t("newCharts", { n: data.diff.added.length })}</summary>
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
                {t("applyAll")}
              </Button>
              <Button variant="ghost" onClick={() => setData(null)} disabled={!!busy}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
