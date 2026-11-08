"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-provider";
import { Button, ButtonLink, Loading, PageHeader, Panel, Segmented } from "@/components/ui";
import type { Lamp, ScoreMap } from "@/lib/core/types";
import { exportCsv, readScoreSheet, type SheetTable } from "@/lib/sheet";
import { supabase } from "@/lib/supabase";

type Merge = "max" | "overwrite";

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
  const [merge, setMerge] = useState<Merge>("max");
  const [busy, setBusy] = useState(false);
  const ids = Object.keys(incoming);
  const higher = ids.filter((id) => !scores[id] || incoming[id].score > scores[id].score).length;
  const lower = ids.filter((id) => scores[id] && incoming[id].score < scores[id].score).length;
  return (
    <div className="mt-5 rounded-[12px] border border-orbit/50 bg-orbit-soft/40 p-4">
      <div className="text-[15px] font-semibold">{title}</div>
      <p className="mt-1 text-[13px] text-mist">
        {ids.length.toLocaleString()}개 채보 중 새로 들어오거나 더 높은 점수 {higher.toLocaleString()}개, 지금보다 낮은 점수 {lower.toLocaleString()}개.
      </p>
      {note}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Segmented<Merge>
          label="합치는 방법"
          value={merge}
          onChange={setMerge}
          options={[
            { value: "max", label: "높은 점수만 반영" },
            { value: "overwrite", label: "파일 내용으로 덮어쓰기" },
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
          {busy ? "반영하는 중" : "점수 반영"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}

function SheetImport() {
  const { charts, applyScores, toast } = useApp();
  const [pending, setPending] = useState<{ scores: ScoreMap; rows: number; unmatched: { title: string; difficulty: string }[]; version: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const { default: readXlsx } = await import("read-excel-file/browser");
      const tables = (await readXlsx(file)) as unknown as SheetTable[];
      const r = readScoreSheet(tables, charts);
      if (!Object.keys(r.scores).length) throw new Error("분석표에 입력된 점수가 없습니다.");
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
      <h2 className="text-[17px] font-semibold">레이팅 분석표(xlsx)에서 가져오기</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-mist">
        Artis+의 Rotaeno 新时代 Rating 分析表 파일을 고르면 「在这里填分数」 시트의 점수와 FC·AP 표시를 읽습니다. 예전 버전 분석표는 곡 제목으로 맞춥니다. 파일은 서버로 올라가지 않고 브라우저에서만 읽습니다.
      </p>
      <input ref={input} type="file" accept=".xlsx" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <Button className="mt-4" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? "읽는 중" : "xlsx 파일 고르기"}
      </Button>
      {pending && (
        <Preview
          incoming={pending.scores}
          title={`분석표 ${pending.version ?? ""}에서 ${pending.rows.toLocaleString()}개 점수를 읽었습니다`}
          note={
            pending.unmatched.length > 0 && (
              <details className="mt-2 text-[13px]">
                <summary className="cursor-pointer text-danger">곡을 찾지 못한 {pending.unmatched.length}개는 건너뜁니다</summary>
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
            toast(r.saved ? `${r.changed.toLocaleString()}개 점수를 반영했습니다.` : `${r.changed.toLocaleString()}개 점수를 반영했고, 서버 저장은 자동으로 다시 시도합니다.`);
            setPending(null);
          }}
        />
      )}
    </Panel>
  );
}

function TapTapImport() {
  const { session, charts, applyScores, toast } = useApp();
  const [region, setRegion] = useState<"global" | "cn">("global");
  const [qr, setQr] = useState<{ svg: string; url: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<{ scores: ScoreMap; name: string; skipped: number } | null>(null);
  const attempt = useRef(0);

  useEffect(() => () => void (attempt.current += 1), []);

  if (!session)
    return (
      <Panel className="p-5 sm:p-6">
        <h2 className="text-[17px] font-semibold">TapTap 클라우드 세이브에서 가져오기</h2>
        <p className="mt-1 text-[14px] text-mist">로그인하면 게임의 클라우드 세이브에서 모든 점수를 한 번에 가져올 수 있습니다.</p>
        <ButtonLink href="/login" className="mt-4">
          로그인하기
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
    setStatus("QR 코드를 만드는 중");
    try {
      const s = await call({ action: "start", region });
      if (!live()) return;
      const svg = await QRCode.toString(s.qrcodeUrl, { type: "svg", margin: 1, color: { dark: "#0f1e33", light: "#ffffff" } });
      setQr({ svg, url: s.qrcodeUrl });
      setStatus("TapTap 앱으로 QR 코드를 스캔하고 로그인을 허용해 주세요.");
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
      setStatus("QR 코드가 만료되었습니다. 다시 시도해 주세요.");
    } catch (e) {
      if (!live()) return;
      setQr(null);
      setStatus(null);
      toast((e as Error).message, "error");
    }
  };

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">TapTap 클라우드 세이브에서 가져오기</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-mist">
        게임에 연결된 TapTap 계정으로 로그인하면 클라우드 세이브의 점수를 읽어 옵니다. 로그인 토큰은 점수를 읽는 동안에만 쓰고 저장하지 않으며, 세이브는 읽기만 합니다.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Segmented
          label="서버"
          value={region}
          onChange={setRegion}
          options={[
            { value: "global", label: "글로벌" },
            { value: "cn", label: "중국" },
          ]}
        />
        <Button variant="primary" onClick={startLogin} disabled={!!qr}>
          QR 코드로 로그인
        </Button>
        {qr && (
          <Button variant="ghost" onClick={() => ((attempt.current += 1), setQr(null), setStatus(null))}>
            취소
          </Button>
        )}
      </div>
      {status && <p className="mt-3 text-[13px] text-mist">{status}</p>}
      {qr && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="w-44 rounded-[12px] border border-line bg-white p-2" dangerouslySetInnerHTML={{ __html: qr.svg }} />
          <div className="max-w-sm text-[13px] leading-relaxed text-mist">
            <p>
              <span className="font-semibold text-ink">PC·태블릿에서 보고 있다면:</span> 폰의 TapTap 앱 스캐너로 이 QR을 찍고 로그인을 허용하세요.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-ink">이 폰 하나뿐이라면:</span> 앱으로 바로 열면 승인 화면이 뜨지 않습니다. 아래 링크를 길게 눌러 브라우저에서 열거나, QR을 캡처해 TapTap 스캐너의 앨범에서 불러오세요.
            </p>
            <a href={qr.url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-medium text-orbit hover:underline">
              승인 페이지 링크
            </a>
          </div>
        </div>
      )}
      {result && (
        <Preview
          incoming={result.scores}
          title={`${result.name || "플레이어"}의 클라우드 세이브`}
          note={result.skipped > 0 && <p className="mt-1 text-[12px] text-mist">곡 데이터에 아직 없는 {result.skipped}개 채보는 건너뜁니다.</p>}
          onCancel={() => setResult(null)}
          onApply={async (m) => {
            const r = await applyScores(result.scores, m);
            toast(r.saved ? `${r.changed.toLocaleString()}개 점수를 반영했습니다.` : `${r.changed.toLocaleString()}개 점수를 반영했고, 서버 저장은 자동으로 다시 시도합니다.`);
            setResult(null);
          }}
        />
      )}
    </Panel>
  );
}

function FileIO() {
  const { charts, scores, analysis, applyScores, toast, clearScores } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ScoreMap | null>(null);
  const day = new Date().toISOString().slice(0, 10);
  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">백업 파일</h2>
      <p className="mt-1 text-[14px] text-mist">JSON은 다시 가져올 수 있는 백업이고, CSV는 표 프로그램에서 열기 위한 파일입니다.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => download(`orbit-scores-${day}.json`, JSON.stringify({ app: "orbit-rating", version: 1, scores }, null, 1), "application/json")}>
          JSON 내보내기
        </Button>
        <Button onClick={() => analysis && download(`orbit-scores-${day}.csv`, "﻿" + exportCsv(charts, scores, (id) => analysis.byId[id].rating), "text/csv")}>
          CSV 내보내기
        </Button>
        <Button onClick={() => input.current?.click()}>JSON 가져오기</Button>
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
              if (!Object.keys(out).length) throw new Error("파일에서 점수를 찾지 못했습니다.");
              setPending(out);
            } catch (err) {
              toast(`JSON을 읽지 못했습니다. ${(err as Error).message}`, "error");
            } finally {
              e.target.value = "";
            }
          }}
        />
      </div>
      {pending && (
        <Preview
          incoming={pending}
          title="JSON 백업"
          onCancel={() => setPending(null)}
          onApply={async (m) => {
            const r = await applyScores(pending, m);
            toast(r.saved ? `${r.changed.toLocaleString()}개 점수를 반영했습니다.` : `${r.changed.toLocaleString()}개 점수를 반영했고, 서버 저장은 자동으로 다시 시도합니다.`);
            setPending(null);
          }}
        />
      )}
      <div className="mt-6 border-t border-line pt-4">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (window.confirm("입력한 모든 점수를 지웁니다. 되돌릴 수 없습니다. 계속할까요?")) clearScores();
          }}
        >
          모든 점수 지우기
        </Button>
      </div>
    </Panel>
  );
}

export default function ImportPage() {
  const { ready } = useApp();
  if (!ready) return <Loading />;
  return (
    <div>
      <PageHeader title="가져오기·내보내기" lead="점수를 한 번에 채우거나 백업합니다. 가져온 점수는 반영 전에 몇 개가 바뀌는지 먼저 보여 줍니다." />
      <div className="flex flex-col gap-4">
        <TapTapImport />
        <SheetImport />
        <FileIO />
      </div>
    </div>
  );
}
