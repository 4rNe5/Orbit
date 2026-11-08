import { cacheLife } from "next/cache";
import chartsJson from "@/data/charts.json";
import { analyze, indexCharts } from "@/lib/core/rating";
import type { Chart, Difficulty, Lamp, ScoreMap } from "@/lib/core/types";
import { rowToChart } from "@/lib/data/charts";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://orbit-rating.vercel.app");

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Anonymous PostgREST read with paging (RLS applies: public profiles only). */
async function rest<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${URL_}/rest/v1/${path}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}`, "Range-Unit": "items" },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const rows = (await res.json()) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

async function currentCharts(): Promise<Chart[]> {
  const v = await rest<{ version: string }>("data_versions?select=version&is_current=eq.true");
  if (!v.length) return chartsJson as Chart[];
  const rows = await rest<Parameters<typeof rowToChart>[0]>(
    "charts?select=id,song_id,title,song_title,difficulty,constant,level,pack,song_pack,version,default_order,update_order,deleted&order=default_order,id",
  );
  return rows.map(rowToChart);
}

export interface PublicSummary {
  handle: string;
  name: string;
  rating: number;
  played: number;
  apPlus: number;
  top: { songId: string; title: string; difficulty: Difficulty; constant: number; effective: number }[];
}

/** Rating summary of a public profile, or null if it doesn't exist or isn't public. Cached for an hour. */
export async function publicSummary(handle: string): Promise<PublicSummary | null> {
  "use cache";
  cacheLife("hours");
  const profiles = await rest<{ user_id: string; handle: string; display_name: string; is_public: boolean }>(
    `profiles?select=user_id,handle,display_name,is_public&handle=eq.${encodeURIComponent(handle)}`,
  );
  const p = profiles[0];
  if (!p || !p.is_public) return null;
  const [charts, rows] = await Promise.all([
    currentCharts(),
    rest<{ chart_id: string; score: number; lamp: Lamp }>(`scores?select=chart_id,score,lamp&user_id=eq.${p.user_id}&order=chart_id`),
  ]);
  const scores: ScoreMap = {};
  for (const r of rows) scores[r.chart_id] = { score: r.score, lamp: r.lamp };
  const a = analyze(indexCharts(charts), scores);
  return {
    handle: p.handle,
    name: p.display_name || p.handle,
    rating: a.rating,
    played: a.played,
    apPlus: a.apPlusInBest,
    top: a.best.slice(0, 5).map((b) => ({
      songId: b.chart.songId,
      title: b.chart.title,
      difficulty: b.chart.difficulty,
      constant: b.chart.constant,
      effective: b.effective,
    })),
  };
}
