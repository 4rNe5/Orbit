"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { BestTile } from "@/components/best-tile";
import { Empty, Loading, Stat } from "@/components/ui";
import { analyzeCompletion } from "@/lib/core/completion";
import { analyze } from "@/lib/core/rating";
import type { Lamp, ScoreMap } from "@/lib/core/types";
import { fmtPercent } from "@/lib/format";
import { selectAll, supabase } from "@/lib/supabase";

interface PublicProfile {
  user_id: string;
  handle: string;
  display_name: string;
  is_public: boolean;
  show_completion: boolean;
}

export function PublicProfile() {
  const { handle } = useParams<{ handle: string }>();
  const { index, ready } = useApp();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [scores, setScores] = useState<ScoreMap | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase()
        .from("profiles")
        .select("user_id, handle, display_name, is_public, show_completion")
        .eq("handle", decodeURIComponent(handle))
        .maybeSingle();
      setProfile((data as PublicProfile) ?? null);
      if (!data) return;
      const rows = await selectAll<{ chart_id: string; score: number; lamp: Lamp }>((from, to) =>
        supabase().from("scores").select("chart_id, score, lamp").eq("user_id", data.user_id).order("chart_id").range(from, to),
      );
      const m: ScoreMap = {};
      for (const r of rows) m[r.chart_id] = { score: r.score, lamp: r.lamp };
      setScores(m);
    })();
  }, [handle]);

  const analysis = useMemo(() => (index && scores ? analyze(index, scores) : null), [index, scores]);
  const completion = useMemo(() => (index && scores ? analyzeCompletion(index, scores) : null), [index, scores]);

  if (profile === null)
    return <Empty title="프로필을 찾을 수 없습니다">주소가 맞는지, 그 트래블러가 프로필을 공개했는지 확인해 주세요.</Empty>;
  if (!ready || !profile || !analysis || !completion) return <Loading />;

  return (
    <div className="pop">
      <section className="relative overflow-hidden rounded-[22px] border border-line bg-paper/70 p-5 backdrop-blur sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-25 blur-2xl" style={{ background: "var(--grad)" }} aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="text-[14px] text-mist">
              {profile.display_name || profile.handle} · @{profile.handle}
              {!profile.is_public && " · 비공개"}
            </div>
            <div className="num grad-text mt-1 text-[56px] font-bold leading-[0.9] tracking-[-0.03em] sm:text-[68px]">
              {analysis.played ? analysis.rating.toFixed(3) : "–"}
            </div>
          </div>
          <div className="flex gap-6">
            <Stat label="입력한 채보" value={analysis.played.toLocaleString()} />
            <Stat label="B40 AP+" value={`${analysis.apPlusInBest}개`} />
            {profile.show_completion && <Stat label="완성도" value={fmtPercent(completion.percent)} />}
          </div>
        </div>
      </section>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {analysis.best.map((r) => (
          <BestTile key={r.chart.id} r={r} />
        ))}
      </div>
    </div>
  );
}
