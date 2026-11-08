import type { Metadata } from "next";
import { notFound } from "next/navigation";
import chartsJson from "@/data/charts.json";
import songInfo from "@/data/songinfo.json";
import { SongDetail, type SongInfo } from "@/components/song-dialog";
import type { Chart } from "@/lib/core/types";
import { packName } from "@/lib/packs";

const charts = chartsJson as Chart[];
const infos = songInfo as unknown as Record<string, SongInfo>;

export function generateStaticParams() {
  return [...new Set(charts.map((c) => c.songId))].map((id) => ({ id }));
}

function songOf(id: string) {
  const list = charts.filter((c) => c.songId === id);
  if (!list.length) return null;
  const main = list.find((c) => c.difficulty === "IV") ?? list[list.length - 1];
  return { list, main, info: infos[id] ?? null };
}

export async function generateMetadata({ params }: PageProps<"/song/[id]">): Promise<Metadata> {
  const { id } = await params;
  const s = songOf(decodeURIComponent(id));
  if (!s) return {};
  const title = s.main.songTitle || s.main.title;
  const levels = s.list.map((c) => `${c.difficulty} ${c.constant.toFixed(1)}`).join(" · ");
  const description = [s.info?.a, packName(s.main.songPack || s.main.pack), levels].filter(Boolean).join(" — ");
  return {
    title,
    description,
    openGraph: { title: `${title} | Orbit Rating`, description, images: [{ url: `/jackets/${s.main.songId}.webp`, width: 256, height: 256 }] },
    twitter: { card: "summary" },
  };
}

export default async function SongPage({ params }: PageProps<"/song/[id]">) {
  const { id } = await params;
  const s = songOf(decodeURIComponent(id));
  if (!s) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <SongDetail songId={s.main.songId} variant="page" initialInfo={s.info} fallbackCharts={s.list} />
    </div>
  );
}
