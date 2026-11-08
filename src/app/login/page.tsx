"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { OrbitGlyph, Panel } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { session, profile } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(`로그인을 시작하지 못했습니다. ${error.message}`);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md pt-6">
      <Panel className="p-6 sm:p-8">
        <OrbitGlyph size={40} />
        <h1 className="mt-4 font-display text-[26px] font-semibold tracking-[-0.02em]">
          {session ? `${profile?.display_name || "트래블러"}님, 로그인되어 있습니다` : "로그인"}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-mist">
          로그인하면 점수가 계정에 저장되어 어느 기기에서든 이어서 볼 수 있습니다. 로그인 전에 이 기기에 입력한 점수는 로그인할 때 계정으로 옮겨집니다.
        </p>
        {!session && (
          <button
            onClick={signIn}
            disabled={busy}
            className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-paper text-[15px] font-medium transition hover:border-line-strong disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2Z" />
              <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2A11 11 0 0 0 1 12c0 1.8.4 3.5 1.2 4.9L5.7 14Z" />
              <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10c.9-2.7 3.4-4.6 6.3-4.6Z" />
            </svg>
            {busy ? "Google로 이동하는 중" : "Google로 계속하기"}
          </button>
        )}
        {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}
      </Panel>
    </div>
  );
}
