"use client";

import { useEffect } from "react";
import { currentLocale, defineDict, translate } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useApp } from "./app-provider";

/**
 * Google One Tap (Google Identity Services + FedCM) → Supabase `signInWithIdToken`.
 * Shown once per page load to signed-out visitors. Needs NEXT_PUBLIC_GOOGLE_CLIENT_ID, and the site
 * origin listed under "Authorized JavaScript origins" of that OAuth client in Google Cloud Console.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SKIP = ["/auth/callback", "/login"];

const T = defineDict({
  ko: { ok: "Google 계정으로 로그인했어요.", fail: "Google 로그인에 실패했어요. {msg}" },
  ja: { ok: "Google アカウントでログインしました。", fail: "Google ログインに失敗しました。{msg}" },
  zh: { ok: "已使用 Google 账号登录。", fail: "Google 登录失败。{msg}" },
});

interface Gsi {
  accounts: {
    id: {
      initialize(o: Record<string, unknown>): void;
      prompt(): void;
      cancel(): void;
    };
  };
}
declare global {
  interface Window {
    google?: Gsi;
  }
}

let script: Promise<void> | null = null;
function loadGsi() {
  script ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      script = null;
      reject(new Error("gsi"));
    };
    document.head.appendChild(s);
  });
  return script;
}

async function nonces(): Promise<[raw: string, hashed: string]> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return [raw, hashed];
}

let prompted = false;

export function GoogleOneTap() {
  const { session, ready, toast } = useApp();

  useEffect(() => {
    if (!CLIENT_ID || session || !ready || prompted) return;
    if (SKIP.some((p) => window.location.pathname.startsWith(p))) return;
    let cancelled = false;
    (async () => {
      try {
        const [[raw, hashed]] = await Promise.all([nonces(), loadGsi()]);
        if (cancelled || !window.google) return;
        prompted = true;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          nonce: hashed,
          use_fedcm_for_prompt: true,
          itp_support: true,
          cancel_on_tap_outside: true,
          context: "signin",
          callback: async ({ credential }: { credential: string }) => {
            const { error } = await supabase().auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
            const l = currentLocale();
            if (error) toast(translate(T, l, "fail", { msg: error.message }), "error");
            else toast(translate(T, l, "ok"));
          },
        });
        window.google.accounts.id.prompt();
      } catch {
        /* GIS blocked or offline: the normal login button still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, ready, toast]);

  useEffect(() => {
    if (session) window.google?.accounts.id.cancel();
  }, [session]);

  return null;
}
