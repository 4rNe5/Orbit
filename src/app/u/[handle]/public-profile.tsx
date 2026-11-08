"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { BestList } from "@/components/best-list";
import { OrbitChart } from "@/components/orbit-chart";
import { Empty, Loading, PageHeader, Panel, Stat } from "@/components/ui";
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
    <div>
      <PageHeader title={profile.display_name || profile.handle} lead={`@${profile.handle}${profile.is_public ? "" : " (비공개, 나에게만 보입니다)"}`} />
      <Panel className="grid items-center gap-6 p-5 sm:grid-cols-[240px_1fr]">
        <div className="mx-auto w-[240px]">
          <OrbitChart best={analysis.best} rating={analysis.played ? analysis.rating : null} caption="레이팅" size={240} />
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Stat label="입력한 채보" value={analysis.played.toLocaleString()} />
          <Stat label="B40 중 AP+" value={`${analysis.apPlusInBest}개`} />
          {profile.show_completion && <Stat label="완성도" value={fmtPercent(completion.percent)} />}
        </div>
      </Panel>
      <div className="mt-6">
        <BestList best={analysis.best} />
      </div>
    </div>
  );
}
