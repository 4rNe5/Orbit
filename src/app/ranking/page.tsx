"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { ButtonLink, Empty, Loading, PageHeader } from "@/components/ui";
import { fmtPercent } from "@/lib/format";
import { supabase } from "@/lib/supabase";

interface Row {
  handle: string;
  display_name: string;
  rating: number;
  played: number;
  completion_percent: number | null;
  updated_at: string;
}

export default function RankingPage() {
  const { profile, session } = useApp();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase()
      .rpc("leaderboard", { max_rows: 200 })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(((data ?? []) as Row[]).map((r) => ({ ...r, rating: Number(r.rating), completion_percent: r.completion_percent === null ? null : Number(r.completion_percent) })));
      });
  }, []);

  return (
    <div>
      <PageHeader
        title="랭킹"
        lead="프로필을 공개한 트래블러의 최신 레이팅입니다. 점수는 각자 입력하거나 가져온 값입니다."
        actions={session && profile && !profile.is_public && <ButtonLink href="/settings">내 프로필 공개하기</ButtonLink>}
      />
      {error && <p className="text-sm text-danger">랭킹을 불러오지 못했습니다. {error}</p>}
      {!rows && !error && <Loading />}
      {rows && rows.length === 0 && <Empty title="아직 공개된 프로필이 없습니다">설정에서 프로필을 공개하면 첫 번째로 이름이 올라갑니다.</Empty>}
      {rows && rows.length > 0 && (
        <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          {rows.map((r, i) => (
            <li key={r.handle} className={`flex items-center gap-4 px-4 py-3 ${profile?.handle === r.handle ? "bg-orbit-soft/60" : ""}`}>
              <span className={`num w-8 text-[15px] ${i < 3 ? "font-semibold text-orbit" : "text-mist"}`}>{i + 1}</span>
              <Link href={`/u/${r.handle}`} className="min-w-0 flex-1 truncate text-[15px] font-medium hover:underline">
                {r.display_name || r.handle}
              </Link>
              <span className="hidden text-[12px] text-mist sm:inline">
                {r.played}채보{r.completion_percent !== null && `, 완성도 ${fmtPercent(r.completion_percent, 1)}`}
              </span>
              <span className="num w-20 text-right text-[17px] font-semibold">{r.rating.toFixed(3)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
