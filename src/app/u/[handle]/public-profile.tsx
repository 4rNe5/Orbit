"use client";

import { RatingNumber, TierBadge } from "@/components/rating";
import { tierStyle } from "@/lib/tiers";
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
import { defineDict, useT } from "@/lib/i18n";

const T = defineDict({
  ko: {
    notFoundTitle: "프로필을 찾을 수 없습니다",
    notFoundBody: "주소가 맞는지, 그 트래블러가 프로필을 공개했는지 확인해 주세요.",
    private: "비공개",
    played: "입력한 채보",
    apCount: "{n}개",
    completion: "완성도",
  },
  ja: {
    notFoundTitle: "プロフィールが見つかりません",
    notFoundBody: "URLが正しいか、そのトラベラーがプロフィールを公開しているかを確認してください。",
    private: "非公開",
    played: "入力した譜面",
    apCount: "{n}曲",
    completion: "完成度",
  },
  zh: {
    notFoundTitle: "找不到该主页",
    notFoundBody: "请确认地址是否正确，以及该旅行者是否已公开主页。",
    private: "未公开",
    played: "已填写谱面",
    apCount: "{n} 首",
    completion: "完成度",
  },
});

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
  const t = useT(T);

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
    return <Empty title={t("notFoundTitle")}>{t("notFoundBody")}</Empty>;
  if (!ready || !profile || !analysis || !completion) return <Loading />;

  return (
    <div>
      <section className="relative overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper p-5 sm:p-6">
        {analysis.played > 0 && <div className="tier-glow pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full opacity-20 blur-3xl sm:-right-20 sm:-top-24 sm:h-80 sm:w-80" style={tierStyle(analysis.rating)} aria-hidden />}
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="text-[14px] text-mist">
              {profile.display_name || profile.handle} · @{profile.handle}
              {!profile.is_public && ` · ${t("private")}`}
            </div>
            <div className="mt-1 flex items-end gap-3">
              {analysis.played ? (
                <>
                  <TierBadge rating={analysis.rating} size={52} className="mb-1" />
                  <RatingNumber rating={analysis.rating} className="text-[56px] font-bold leading-[0.9] tracking-[-0.03em] sm:text-[68px]" />
                </>
              ) : (
                <span className="num text-[56px] font-bold leading-[0.9] text-mist">–</span>
              )}
            </div>
          </div>
          <div className="flex gap-6">
            <Stat label={t("played")} value={analysis.played.toLocaleString()} />
            <Stat label="B40 AP+" value={t("apCount", { n: analysis.apPlusInBest })} />
            {profile.show_completion && <Stat label={t("completion")} value={fmtPercent(completion.percent)} />}
          </div>
        </div>
      </section>
      <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-8">
        {analysis.best.map((r) => (
          <BestTile key={r.chart.id} r={r} />
        ))}
      </div>
    </div>
  );
}
