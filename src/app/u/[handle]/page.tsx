import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { publicSummary } from "@/lib/server/public-summary";
import { PublicProfile } from "./public-profile";

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const s = await publicSummary(decodeURIComponent(handle)).catch(() => null);
  if (!s) return { title: `@${decodeURIComponent(handle)}` };
  const title = `${s.name} (@${s.handle})`;
  const description = `Rotaeno Rating ${s.rating.toFixed(3)} · ${s.played.toLocaleString()} charts · B40 AP+ ${s.apPlus}`;
  return { title, description, openGraph: { title: `${title} | Orbit Rating`, description }, twitter: { card: "summary_large_image" } };
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PublicProfile />
    </Suspense>
  );
}
