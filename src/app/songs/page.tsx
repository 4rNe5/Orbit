import type { Metadata } from "next";
import chartsJson from "@/data/charts.json";
import meta from "@/data/meta.json";
import songInfo from "@/data/songinfo.json";
import type { Chart } from "@/lib/core/types";
import { buildSongs, metaFromInfo } from "@/lib/songs";
import { SongsBrowser } from "./songs-browser";

export const metadata: Metadata = {
  title: "악곡 정보",
  description: "Rotaeno 전곡을 팩·버전별로 정리한 목록. 난이도별 정수와 곡 정보 · Rotaeno 楽曲一覧 · Rotaeno 曲目一览",
};

/** Built at compile time from the bundled data; the client swaps in live charts once they load. */
const ROWS = buildSongs(chartsJson as Chart[], metaFromInfo(songInfo as unknown as Parameters<typeof metaFromInfo>[0]));

export default function SongsPage() {
  return <SongsBrowser initial={ROWS} dataVersion={meta.gameVersion} />;
}
