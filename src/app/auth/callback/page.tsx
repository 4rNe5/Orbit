"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loading } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error_description") || params.get("error");
    if (err) {
      void Promise.resolve().then(() => setError(err));
      return;
    }
    const code = params.get("code");
    const sb = supabase();
    (async () => {
      // The client also detects the code by itself; exchanging twice is harmless but the second call fails, so check first.
      const { data } = await sb.auth.getSession();
      if (!data.session && code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }
      }
      router.replace("/");
    })();
  }, [router]);

  if (error)
    return (
      <div className="mx-auto max-w-md rounded-[12px] border border-danger/40 bg-paper p-5 text-sm">
        <p className="font-semibold text-danger">로그인하지 못했습니다.</p>
        <p className="mt-1 text-mist">{error}</p>
        <a href="/login" className="mt-3 inline-block font-medium text-orbit">
          다시 로그인하기
        </a>
      </div>
    );
  return <Loading label="로그인하는 중" />;
}
