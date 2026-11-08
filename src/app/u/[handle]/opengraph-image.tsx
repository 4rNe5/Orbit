import { OG_SIZE, profileCard } from "@/lib/server/og";
import { publicSummary } from "@/lib/server/public-summary";

export const alt = "Orbit Rating 프로필";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const h = decodeURIComponent(handle);
  return profileCard(await publicSummary(h).catch(() => null), h);
}
