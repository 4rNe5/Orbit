"use client";

/**
 * Minimal i18n: Korean (source), Japanese, Simplified Chinese.
 *
 * Each module keeps its own strings next to the code:
 *
 *   const T = defineDict({
 *     ko: { title: "점수 입력", rows: "{n}개 채보" },
 *     ja: { title: "スコア入力", rows: "{n}譜面" },
 *     zh: { title: "录入分数", rows: "{n} 个谱面" },
 *   });
 *   const t = useT(T);  t("rows", { n: 12 })
 *
 * The locale lives in localStorage ("orbit:lang"); first visit picks it from the browser language.
 * Server-rendered HTML is Korean; the client switches right after hydration.
 */
import { useCallback, useSyncExternalStore } from "react";

export type Locale = "ko" | "ja" | "zh";
export const LOCALES: { id: Locale; label: string; html: string }[] = [
  { id: "ko", label: "한국어", html: "ko" },
  { id: "ja", label: "日本語", html: "ja" },
  { id: "zh", label: "中文", html: "zh-CN" },
];

const KEY = "orbit:lang";
const EVENT = "orbit:lang";

function detect(): Locale {
  for (const l of navigator.languages ?? [navigator.language]) {
    const s = l.toLowerCase();
    if (s.startsWith("ko")) return "ko";
    if (s.startsWith("ja")) return "ja";
    if (s.startsWith("zh")) return "zh";
  }
  return "ko";
}

function read(): Locale {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "ko" || v === "ja" || v === "zh") return v;
  } catch {
    /* storage unavailable */
  }
  return detect();
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, read, () => "ko");
}

export function setLocale(l: Locale) {
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* storage unavailable */
  }
  document.documentElement.lang = LOCALES.find((x) => x.id === l)?.html ?? l;
  window.dispatchEvent(new Event(EVENT));
}

/** Current locale outside React (e.g. in callbacks). */
export function currentLocale(): Locale {
  return typeof window === "undefined" ? "ko" : read();
}

export type Dict<K extends string> = { ko: Record<K, string>; ja: Record<K, string>; zh: Record<K, string> };
export const defineDict = <K extends string>(d: Dict<K>) => d;

export type Vars = Record<string, string | number>;
export function format(s: string, vars?: Vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

export function translate<K extends string>(d: Dict<K>, l: Locale, k: K, vars?: Vars) {
  return format(d[l][k] ?? d.ko[k], vars);
}

export function useT<K extends string>(d: Dict<K>) {
  const l = useLocale();
  return useCallback((k: K, vars?: Vars) => translate(d, l, k, vars), [d, l]);
}
