import { OG_SIZE, siteCard } from "@/lib/server/og";

export const alt = "Orbit Rating — Rotaeno 레이팅 분석";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return siteCard();
}
