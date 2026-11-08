"use client";

import { RatingNumber, TierBadge } from "@/components/rating";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app-provider";
import { ButtonLink, Empty, Loading, PageHeader } from "@/components/ui";
import { fmtPercent } from "@/lib/format";
import { defineDict, useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

const T = defineDict({
  ko: {
    title: "랭킹",
    lead: "프로필을 공개한 트래블러의 최신 레이팅입니다. 점수는 각자 입력하거나 가져온 값입니다.",
    makePublic: "내 프로필 공개하기",
    loadFailed: "랭킹을 불러오지 못했습니다. {msg}",
    emptyTitle: "아직 공개된 프로필이 없습니다",
    emptyBody: "설정에서 프로필을 공개하면 첫 번째로 이름이 올라갑니다.",
    charts: "{n}채보",
    completion: ", 완성도 {pct}",
  },
  ja: {
    title: "ランキング",
    lead: "プロフィールを公開しているトラベラーの最新レートです。スコアは各自が入力またはインポートした値です。",
    makePublic: "自分のプロフィールを公開する",
    loadFailed: "ランキングを読み込めませんでした。{msg}",
    emptyTitle: "まだ公開プロフィールがありません",
    emptyBody: "設定でプロフィールを公開すると、最初に名前が載ります。",
    charts: "{n}譜面",
    completion: "、完成度 {pct}",
  },
  zh: {
    title: "排行榜",
    lead: "公开个人资料的旅行者的最新 Rating。分数为各自录入或导入的数据。",
    makePublic: "公开我的个人资料",
    loadFailed: "无法加载排行榜。{msg}",
    emptyTitle: "还没有公开的个人资料",
    emptyBody: "在设置中公开个人资料，你就会第一个登上排行榜。",
    charts: "{n} 个谱面",
    completion: "，完成度 {pct}",
  },
});

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
  const t = useT(T);
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
        title={t("title")}
        help={t("lead")}
        actions={session && profile && !profile.is_public && <ButtonLink href="/settings">{t("makePublic")}</ButtonLink>}
      />
      {error && <p className="text-sm text-danger">{t("loadFailed", { msg: error })}</p>}
      {!rows && !error && <Loading />}
      {rows && rows.length === 0 && <Empty title={t("emptyTitle")}>{t("emptyBody")}</Empty>}
      {rows && rows.length > 0 && (
        <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper">
          {rows.map((r, i) => (
            <li key={r.handle} className={`flex items-center gap-4 px-4 py-3 ${profile?.handle === r.handle ? "bg-orbit-soft/60" : ""}`}>
              <span className={`num w-8 text-[15px] ${i < 3 ? "font-semibold text-orbit" : "text-mist"}`}>{i + 1}</span>
              <Link href={`/u/${r.handle}`} className="min-w-0 flex-1 truncate text-[15px] font-medium hover:underline">
                {r.display_name || r.handle}
              </Link>
              <span className="hidden text-[12px] text-mist sm:inline">
                {t("charts", { n: r.played })}
                {r.completion_percent !== null && t("completion", { pct: fmtPercent(r.completion_percent, 1) })}
              </span>
              <span className="flex w-28 items-center justify-end gap-1.5">
                <TierBadge rating={r.rating} size={22} />
                <RatingNumber rating={r.rating} className="text-[17px] font-bold" />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
