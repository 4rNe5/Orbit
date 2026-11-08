"use client";

import { LOCALES, setLocale, useLocale } from "@/lib/i18n";
import { cx } from "./ui";

/** 한국어 / 日本語 / 中文 toggle. (`variant` is accepted for older call sites; both render the same.) */
export function LanguageSwitcher({ className }: { variant?: "pill" | "inline"; className?: string }) {
  const l = useLocale();
  return (
    <div
      role="radiogroup"
      aria-label="Language / 언어 / 言語 / 语言"
      className={cx("inline-flex items-center rounded-[8px] border border-line bg-paper p-0.5", className)}
    >
      {LOCALES.map((x) => (
        <button
          key={x.id}
          type="button"
          role="radio"
          aria-checked={l === x.id}
          lang={x.html}
          onClick={() => setLocale(x.id)}
          className={cx(
            "rounded-[6px] px-2.5 py-1 text-[12px] font-semibold transition",
            l === x.id ? "bg-ink text-sky" : "text-mist hover:text-ink",
          )}
        >
          {x.label}
        </button>
      ))}
    </div>
  );
}
