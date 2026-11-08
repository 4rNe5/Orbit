"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Button, ButtonLink, Loading, PageHeader, Panel, Segmented } from "@/components/ui";
import type { Lamp, ScoreMap } from "@/lib/core/types";
import { defineDict, useT } from "@/lib/i18n";
import { exportCsv, readScoreSheet, type SheetTable } from "@/lib/sheet";
import { supabase } from "@/lib/supabase";

type Merge = "max" | "overwrite";

const T = defineDict({
  ko: {
    previewCounts: "{total}개 채보 중 새로 들어오거나 더 높은 점수 {higher}개, 지금보다 낮은 점수 {lower}개.",
    mergeLabel: "합치는 방법",
    mergeMax: "높은 점수만 반영",
    mergeOverwrite: "파일 내용으로 덮어쓰기",
    applying: "반영하는 중",
    apply: "점수 반영",
    cancel: "취소",
    applied: "{n}개 점수를 반영했습니다.",
    appliedRetry: "{n}개 점수를 반영했고, 서버 저장은 자동으로 다시 시도합니다.",
    sheetEmpty: "분석표에 입력된 점수가 없습니다.",
    sheetTitle: "레이팅 분석표(xlsx)에서 가져오기",
    sheetLead:
      "Artis+의 Rotaeno 新时代 Rating 分析表 파일을 고르면 「在这里填分数」 시트의 점수와 FC·AP 표시를 읽습니다. 예전 버전 분석표는 곡 제목으로 맞춥니다. 파일은 서버로 올라가지 않고 브라우저에서만 읽습니다.",
    reading: "읽는 중",
    pickXlsx: "xlsx 파일 고르기",
    sheetRead: "분석표 {version}에서 {n}개 점수를 읽었습니다",
    sheetUnmatched: "곡을 찾지 못한 {n}개는 건너뜁니다",
    taptapTitle: "TapTap 클라우드 세이브에서 가져오기",
    taptapLoginLead: "로그인하면 게임의 클라우드 세이브에서 모든 점수를 한 번에 가져올 수 있습니다.",
    login: "로그인하기",
    qrMaking: "QR 코드를 만드는 중",
    qrScan: "TapTap 앱으로 QR 코드를 스캔하고 로그인을 허용해 주세요.",
    qrExpired: "QR 코드가 만료되었습니다. 다시 시도해 주세요.",
    taptapLead:
      "게임에 연결된 TapTap 계정으로 로그인하면 클라우드 세이브의 점수를 읽어 옵니다. 로그인 토큰은 점수를 읽는 동안에만 쓰고 저장하지 않으며, 세이브는 읽기만 합니다.",
    region: "서버",
    regionGlobal: "글로벌",
    regionCn: "중국",
    qrLogin: "QR 코드로 로그인",
    qrPcLabel: "PC·태블릿에서 보고 있다면:",
    qrPcBody: "폰의 TapTap 앱 스캐너로 이 QR을 찍고 로그인을 허용하세요.",
    qrPhoneLabel: "이 폰 하나뿐이라면:",
    qrPhoneBody: "앱으로 바로 열면 승인 화면이 뜨지 않습니다. 아래 링크를 길게 눌러 브라우저에서 열거나, QR을 캡처해 TapTap 스캐너의 앨범에서 불러오세요.",
    qrLink: "승인 페이지 링크",
    cloudSaveOf: "{name}의 클라우드 세이브",
    player: "플레이어",
    taptapSkipped: "곡 데이터에 아직 없는 {n}개 채보는 건너뜁니다.",
    backupTitle: "백업 파일",
    backupLead: "JSON은 다시 가져올 수 있는 백업이고, CSV는 표 프로그램에서 열기 위한 파일입니다.",
    exportJson: "JSON 내보내기",
    exportCsv: "CSV 내보내기",
    importJson: "JSON 가져오기",
    jsonEmpty: "파일에서 점수를 찾지 못했습니다.",
    jsonFailed: "JSON을 읽지 못했습니다. {msg}",
    jsonBackup: "JSON 백업",
    clearConfirm: "입력한 모든 점수를 지웁니다. 되돌릴 수 없습니다. 계속할까요?",
    clearAll: "모든 점수 지우기",
    pageTitle: "가져오기·내보내기",
    pageLead: "점수를 한 번에 채우거나 백업합니다. 가져온 점수는 반영 전에 몇 개가 바뀌는지 먼저 보여 줍니다.",
  },
  ja: {
    previewCounts: "{total}譜面のうち、新規または現在より高いスコアが{higher}件、現在より低いスコアが{lower}件です。",
    mergeLabel: "統合方法",
    mergeMax: "高いスコアのみ反映",
    mergeOverwrite: "ファイルの内容で上書き",
    applying: "反映中",
    apply: "スコアを反映",
    cancel: "キャンセル",
    applied: "{n}件のスコアを反映しました。",
    appliedRetry: "{n}件のスコアを反映しました。サーバーへの保存は自動で再試行します。",
    sheetEmpty: "分析表に入力されたスコアがありません。",
    sheetTitle: "レート分析表(xlsx)からインポート",
    sheetLead:
      "Artis+ の Rotaeno 新时代 Rating 分析表ファイルを選ぶと、「在这里填分数」シートのスコアと FC・AP 表示を読み込みます。旧バージョンの分析表は楽曲名で照合します。ファイルはサーバーにアップロードされず、ブラウザ内でのみ読み込みます。",
    reading: "読み込み中",
    pickXlsx: "xlsx ファイルを選択",
    sheetRead: "分析表 {version} から{n}件のスコアを読み込みました",
    sheetUnmatched: "楽曲が見つからなかった{n}件はスキップします",
    taptapTitle: "TapTap クラウドセーブからインポート",
    taptapLoginLead: "ログインすると、ゲームのクラウドセーブからすべてのスコアを一度にインポートできます。",
    login: "ログイン",
    qrMaking: "QR コードを作成中",
    qrScan: "TapTap アプリで QR コードをスキャンし、ログインを許可してください。",
    qrExpired: "QR コードの有効期限が切れました。もう一度お試しください。",
    taptapLead:
      "ゲームに連携している TapTap アカウントでログインすると、クラウドセーブのスコアを読み込みます。ログイントークンはスコアの読み込み中にのみ使用して保存せず、セーブデータは読み取るだけです。",
    region: "サーバー",
    regionGlobal: "グローバル",
    regionCn: "中国",
    qrLogin: "QR コードでログイン",
    qrPcLabel: "PC・タブレットで見ている場合:",
    qrPcBody: "スマホの TapTap アプリのスキャナーでこの QR を読み取り、ログインを許可してください。",
    qrPhoneLabel: "このスマホしかない場合:",
    qrPhoneBody:
      "アプリで直接開くと承認画面が表示されません。下のリンクを長押ししてブラウザで開くか、QR をスクリーンショットして TapTap スキャナーのアルバムから読み込んでください。",
    qrLink: "承認ページのリンク",
    cloudSaveOf: "{name}のクラウドセーブ",
    player: "プレイヤー",
    taptapSkipped: "楽曲データにまだない{n}譜面はスキップします。",
    backupTitle: "バックアップファイル",
    backupLead: "JSON は再インポートできるバックアップ、CSV は表計算ソフトで開くためのファイルです。",
    exportJson: "JSON をエクスポート",
    exportCsv: "CSV をエクスポート",
    importJson: "JSON をインポート",
    jsonEmpty: "ファイルにスコアが見つかりません。",
    jsonFailed: "JSON を読み込めませんでした。{msg}",
    jsonBackup: "JSON バックアップ",
    clearConfirm: "入力したすべてのスコアを削除します。元に戻せません。続けますか?",
    clearAll: "すべてのスコアを削除",
    pageTitle: "インポート・エクスポート",
    pageLead: "スコアを一括で入力したり、バックアップしたりできます。インポートしたスコアは、反映前に何件変わるかを先に表示します。",
  },
  zh: {
    previewCounts: "{total} 个谱面中，新增或更高的分数 {higher} 个，低于当前的分数 {lower} 个。",
    mergeLabel: "合并方式",
    mergeMax: "仅保留更高分数",
    mergeOverwrite: "用文件内容覆盖",
    applying: "正在应用",
    apply: "应用分数",
    cancel: "取消",
    applied: "已应用 {n} 个分数。",
    appliedRetry: "已应用 {n} 个分数，服务器保存会自动重试。",
    sheetEmpty: "分析表中没有已填写的分数。",
    sheetTitle: "从 Rating 分析表(xlsx)导入",
    sheetLead:
      "选择 Artis+ 制作的 Rotaeno 新时代 Rating 分析表文件，即可读取「在这里填分数」工作表中的分数和 FC·AP 标记。旧版分析表按曲名匹配。文件不会上传到服务器，只在浏览器中读取。",
    reading: "正在读取",
    pickXlsx: "选择 xlsx 文件",
    sheetRead: "已从分析表 {version} 读取 {n} 个分数",
    sheetUnmatched: "跳过 {n} 个找不到曲目的条目",
    taptapTitle: "从 TapTap 云存档导入",
    taptapLoginLead: "登录后即可从游戏云存档一次性导入全部分数。",
    login: "登录",
    qrMaking: "正在生成二维码",
    qrScan: "请用 TapTap App 扫描二维码并允许登录。",
    qrExpired: "二维码已过期，请重试。",
    taptapLead: "用与游戏绑定的 TapTap 账号登录后，即可读取云存档中的分数。登录令牌仅在读取分数时使用，不会保存；存档只读不写。",
    region: "服务器",
    regionGlobal: "国际服",
    regionCn: "国服",
    qrLogin: "扫码登录",
    qrPcLabel: "如果你在电脑或平板上浏览:",
    qrPcBody: "用手机 TapTap App 的扫一扫扫描此二维码并允许登录。",
    qrPhoneLabel: "如果只有这一部手机:",
    qrPhoneBody: "直接用 App 打开不会出现授权页面。请长按下方链接在浏览器中打开，或截图二维码后在 TapTap 扫一扫中从相册选取。",
    qrLink: "授权页面链接",
    cloudSaveOf: "{name} 的云存档",
    player: "玩家",
    taptapSkipped: "跳过曲目数据中尚未收录的 {n} 个谱面。",
    backupTitle: "备份文件",
    backupLead: "JSON 是可以重新导入的备份，CSV 用于在表格软件中打开。",
    exportJson: "导出 JSON",
    exportCsv: "导出 CSV",
    importJson: "导入 JSON",
    jsonEmpty: "文件中没有找到分数。",
    jsonFailed: "无法读取 JSON。{msg}",
    jsonBackup: "JSON 备份",
    clearConfirm: "将清除所有已录入的分数，且无法恢复。确定继续吗?",
    clearAll: "清除所有分数",
    pageTitle: "导入·导出",
    pageLead: "一次性填入分数或进行备份。导入的分数会在应用前先显示有多少条会发生变化。",
  },
});

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Preview({
  incoming,
  title,
  note,
  onApply,
  onCancel,
}: {
  incoming: ScoreMap;
  title: string;
  note?: React.ReactNode;
  onApply: (m: Merge) => Promise<void>;
  onCancel: () => void;
}) {
  const { scores } = useApp();
  const t = useT(T);
  const [merge, setMerge] = useState<Merge>("max");
  const [busy, setBusy] = useState(false);
  const ids = Object.keys(incoming);
  const higher = ids.filter((id) => !scores[id] || incoming[id].score > scores[id].score).length;
  const lower = ids.filter((id) => scores[id] && incoming[id].score < scores[id].score).length;
  return (
    <div className="mt-5 rounded-[8px] border border-orbit/50 bg-orbit-soft p-4">
      <div className="text-[15px] font-semibold">{title}</div>
      <p className="mt-1 text-[13px] text-mist">
        {t("previewCounts", { total: ids.length.toLocaleString(), higher: higher.toLocaleString(), lower: lower.toLocaleString() })}
      </p>
      {note}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Segmented<Merge>
          label={t("mergeLabel")}
          value={merge}
          onChange={setMerge}
          options={[
            { value: "max", label: t("mergeMax") },
            { value: "overwrite", label: t("mergeOverwrite") },
          ]}
        />
        <Button
          variant="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onApply(merge);
            setBusy(false);
          }}
        >
          {busy ? t("applying") : t("apply")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

function SheetImport() {
  const { charts, applyScores, toast } = useApp();
  const t = useT(T);
  const [pending, setPending] = useState<{ scores: ScoreMap; rows: number; unmatched: { title: string; difficulty: string }[]; version: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const { default: readXlsx } = await import("read-excel-file/browser");
      const tables = (await readXlsx(file)) as unknown as SheetTable[];
      const r = readScoreSheet(tables, charts);
      if (!Object.keys(r.scores).length) throw new Error(t("sheetEmpty"));
      setPending({ scores: r.scores, rows: r.rows, unmatched: r.unmatched, version: r.sheetVersion });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">{t("sheetTitle")}</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-mist">{t("sheetLead")}</p>
      <input ref={input} type="file" accept=".xlsx" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <Button className="mt-4" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? t("reading") : t("pickXlsx")}
      </Button>
      {pending && (
        <Preview
          incoming={pending.scores}
          title={t("sheetRead", { version: pending.version ?? "", n: pending.rows.toLocaleString() })}
          note={
            pending.unmatched.length > 0 && (
              <details className="mt-2 text-[13px]">
                <summary className="cursor-pointer text-danger">{t("sheetUnmatched", { n: pending.unmatched.length })}</summary>
                <ul className="mt-1 list-disc pl-5 text-mist">
                  {pending.unmatched.slice(0, 30).map((u) => (
                    <li key={`${u.title}-${u.difficulty}`}>
                      {u.title} {u.difficulty}
                    </li>
                  ))}
                </ul>
              </details>
            )
          }
          onCancel={() => setPending(null)}
          onApply={async (m) => {
            const r = await applyScores(pending.scores, m);
            toast(t(r.saved ? "applied" : "appliedRetry", { n: r.changed.toLocaleString() }));
            setPending(null);
          }}
        />
      )}
    </Panel>
  );
}

function TapTapImport() {
  const { session, charts, applyScores, toast } = useApp();
  const t = useT(T);
  const [region, setRegion] = useState<"global" | "cn">("global");
  const [qr, setQr] = useState<{ svg: string; url: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<{ scores: ScoreMap; name: string; skipped: number } | null>(null);
  const attempt = useRef(0);

  useEffect(() => () => void (attempt.current += 1), []);

  if (!session)
    return (
      <Panel className="p-5 sm:p-6">
        <h2 className="text-[17px] font-semibold">{t("taptapTitle")}</h2>
        <p className="mt-1 text-[14px] text-mist">{t("taptapLoginLead")}</p>
        <ButtonLink href="/login" className="mt-4">
          {t("login")}
        </ButtonLink>
      </Panel>
    );

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase().functions.invoke("taptap-import", { body });
    if (error) {
      let msg = error.message;
      try {
        msg = (await (error as { context?: Response }).context?.json())?.error ?? msg;
      } catch {
        /* keep message */
      }
      throw new Error(msg);
    }
    return data;
  };

  const startLogin = async () => {
    const my = ++attempt.current;
    const live = () => attempt.current === my;
    setResult(null);
    setStatus(t("qrMaking"));
    try {
      const s = await call({ action: "start", region });
      if (!live()) return;
      const svg = await QRCode.toString(s.qrcodeUrl, { type: "svg", margin: 1, color: { dark: "#0f1e33", light: "#ffffff" } });
      setQr({ svg, url: s.qrcodeUrl });
      setStatus(t("qrScan"));
      const deadline = Date.now() + s.expiresIn * 1000;
      while (live() && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, Math.max(2, s.interval) * 1000));
        if (!live()) return;
        const p = await call({ action: "poll", region, deviceCode: s.deviceCode, deviceId: s.deviceId });
        if (!live()) return;
        if (p.status === "expired") break;
        if (p.status === "done") {
          const ids = new Set(charts.map((c) => c.id));
          const scores: ScoreMap = {};
          let skipped = 0;
          for (const r of p.records as { songId: string; difficulty: string; score: number; lamp: Lamp }[]) {
            const id = `${r.songId}:${r.difficulty}`;
            if (ids.has(id)) scores[id] = { score: r.score, lamp: r.lamp };
            else skipped++;
          }
          setQr(null);
          setStatus(null);
          setResult({ scores, name: p.displayName, skipped });
          return;
        }
      }
      if (!live()) return;
      setQr(null);
      setStatus(t("qrExpired"));
    } catch (e) {
      if (!live()) return;
      setQr(null);
      setStatus(null);
      toast((e as Error).message, "error");
    }
  };

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">{t("taptapTitle")}</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-mist">{t("taptapLead")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Segmented
          label={t("region")}
          value={region}
          onChange={setRegion}
          options={[
            { value: "global", label: t("regionGlobal") },
            { value: "cn", label: t("regionCn") },
          ]}
        />
        <Button variant="primary" onClick={startLogin} disabled={!!qr}>
          {t("qrLogin")}
        </Button>
        {qr && (
          <Button variant="ghost" onClick={() => ((attempt.current += 1), setQr(null), setStatus(null))}>
            {t("cancel")}
          </Button>
        )}
      </div>
      {status && <p className="mt-3 text-[13px] text-mist">{status}</p>}
      {qr && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="w-44 rounded-[8px] border border-line bg-white p-2" dangerouslySetInnerHTML={{ __html: qr.svg }} />
          <div className="max-w-sm text-[13px] leading-relaxed text-mist">
            <p>
              <span className="font-semibold text-ink">{t("qrPcLabel")}</span> {t("qrPcBody")}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-ink">{t("qrPhoneLabel")}</span> {t("qrPhoneBody")}
            </p>
            <a href={qr.url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-medium text-orbit hover:underline">
              {t("qrLink")}
            </a>
          </div>
        </div>
      )}
      {result && (
        <Preview
          incoming={result.scores}
          title={t("cloudSaveOf", { name: result.name || t("player") })}
          note={result.skipped > 0 && <p className="mt-1 text-[12px] text-mist">{t("taptapSkipped", { n: result.skipped })}</p>}
          onCancel={() => setResult(null)}
          onApply={async (m) => {
            const r = await applyScores(result.scores, m);
            toast(t(r.saved ? "applied" : "appliedRetry", { n: r.changed.toLocaleString() }));
            setResult(null);
          }}
        />
      )}
    </Panel>
  );
}

function FileIO() {
  const { charts, scores, analysis, applyScores, toast, clearScores } = useApp();
  const t = useT(T);
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ScoreMap | null>(null);
  const day = new Date().toISOString().slice(0, 10);
  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">{t("backupTitle")}</h2>
      <p className="mt-1 text-[14px] text-mist">{t("backupLead")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => download(`orbit-scores-${day}.json`, JSON.stringify({ app: "orbit-rating", version: 1, scores }, null, 1), "application/json")}>
          {t("exportJson")}
        </Button>
        <Button onClick={() => analysis && download(`orbit-scores-${day}.csv`, "﻿" + exportCsv(charts, scores, (id) => analysis.byId[id].rating), "text/csv")}>
          {t("exportCsv")}
        </Button>
        <Button onClick={() => input.current?.click()}>{t("importJson")}</Button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const j = JSON.parse(await f.text());
              const src = (j.scores ?? j) as Record<string, { score: number; lamp?: Lamp }>;
              const ids = new Set(charts.map((c) => c.id));
              const out: ScoreMap = {};
              for (const [id, v] of Object.entries(src)) {
                if (ids.has(id) && Number.isFinite(v.score) && v.score >= 0 && v.score <= 1_010_000)
                  out[id] = { score: Math.round(v.score), lamp: v.lamp === "ap" || v.lamp === "fc" ? v.lamp : "none" };
              }
              if (!Object.keys(out).length) throw new Error(t("jsonEmpty"));
              setPending(out);
            } catch (err) {
              toast(t("jsonFailed", { msg: (err as Error).message }), "error");
            } finally {
              e.target.value = "";
            }
          }}
        />
      </div>
      {pending && (
        <Preview
          incoming={pending}
          title={t("jsonBackup")}
          onCancel={() => setPending(null)}
          onApply={async (m) => {
            const r = await applyScores(pending, m);
            toast(t(r.saved ? "applied" : "appliedRetry", { n: r.changed.toLocaleString() }));
            setPending(null);
          }}
        />
      )}
      <div className="mt-6 border-t border-line pt-4">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (window.confirm(t("clearConfirm"))) clearScores();
          }}
        >
          {t("clearAll")}
        </Button>
      </div>
    </Panel>
  );
}

export default function ImportPage() {
  const { ready } = useApp();
  const t = useT(T);
  if (!ready) return <Loading />;
  return (
    <div>
      <PageHeader title={t("pageTitle")} help={t("pageLead")} />
      <div className="flex flex-col gap-4">
        <TapTapImport />
        <SheetImport />
        <FileIO />
      </div>
    </div>
  );
}
