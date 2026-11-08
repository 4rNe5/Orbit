import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { PublicProfile } from "./public-profile";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PublicProfile />
    </Suspense>
  );
}
