"use client";

import Link from "next/link";
import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { Difficulty, Lamp } from "@/lib/core/types";
import { diffClass } from "@/lib/format";
import { defineDict, useT } from "@/lib/i18n";

const T = defineDict({
  ko: { loading: "불러오는 중", help: "설명 보기" },
  ja: { loading: "読み込み中", help: "説明を見る" },
  zh: { loading: "加载中", help: "查看说明" },
});

export function cx(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "quiet" | "ghost" | "danger";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-orbit text-orbit-ink hover:brightness-105 active:brightness-95",
  quiet: "bg-paper text-ink border border-line hover:border-line-strong",
  ghost: "text-ink hover:bg-orbit-soft",
  danger: "bg-paper text-danger border border-line hover:border-danger",
};

export function Button({
  variant = "quiet",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[8px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        BTN[variant],
        className,
      )}
    />
  );
}

export function ButtonLink({ href, children, variant = "quiet", className }: { href: string; children: ReactNode; variant?: BtnVariant; className?: string }) {
  return (
    <Link
      href={href}
      className={cx("inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-4 text-sm font-medium transition", BTN[variant], className)}
    >
      {children}
    </Link>
  );
}

export function Panel({ children, className, as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <As className={cx("rounded-[var(--radius-panel)] border border-line bg-paper", className)}>{children}</As>;
}

/**
 * Page title row. `meta` is one short line of facts (counts, version, where data is saved);
 * `help` is the longer explanation, hidden behind a "?" toggle so pages open on their data.
 */
export function PageHeader({ title, meta, help, actions }: { title: string; meta?: ReactNode; help?: ReactNode; actions?: ReactNode }) {
  const t = useT(T);
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <header className="mb-5 border-b border-line pb-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.01em] sm:text-[24px]">{title}</h1>
            {help && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls={id}
                aria-label={t("help")}
                className={cx(
                  "grid h-6 w-6 place-items-center rounded-full border text-[12px] font-semibold transition",
                  open ? "border-ink bg-ink text-bg" : "border-line-2 text-mist hover:text-ink",
                )}
              >
                ?
              </button>
            )}
          </div>
          {meta && <p className="mt-1 text-[13px] text-mist">{meta}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {help && open && (
        <div id={id} className="mt-3 max-w-2xl rounded-[8px] bg-paper-2 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
          {help}
        </div>
      )}
    </header>
  );
}

/** Difficulty mark: a short arc like a Rotaeno note, plus the label. */
export function DiffMark({ d, constant, compact }: { d: Difficulty; constant?: number; compact?: boolean }) {
  return (
    <span className={cx(diffClass(d), "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap")}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <path d="M2.5 9.5 A 5.5 5.5 0 0 1 11.5 9.5" fill="none" stroke="var(--diff)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="text-[12px] font-semibold" style={{ color: "var(--diff)" }}>
        {d}
      </span>
      {!compact && constant !== undefined && <span className="num text-[12px] text-mist">{constant.toFixed(1)}</span>}
    </span>
  );
}

export function LampBadge({ lamp, apPlus }: { lamp: Lamp; apPlus?: boolean }) {
  if (apPlus) return <span className="max-bg rounded-[4px] px-1.5 py-0.5 text-[11px] font-bold">AP+</span>;
  if (lamp === "ap") return <span className="rounded-[4px] bg-ap px-1.5 py-0.5 text-[11px] font-bold text-[#1a1206]">AP</span>;
  if (lamp === "fc") return <span className="rounded-[4px] bg-fc px-1.5 py-0.5 text-[11px] font-bold text-white">FC</span>;
  return null;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-mist">{label}</div>
      <div className="num mt-1 text-[22px] font-semibold leading-none">{value}</div>
      {hint && <div className="mt-1.5 text-[12px] text-mist">{hint}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[8px] border border-line bg-paper p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-8 rounded-[6px] px-3 text-[13px] font-medium transition",
            value === o.value ? "bg-ink text-sky" : "text-mist hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children, className }: { active: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "h-8 rounded-[8px] border px-3 text-[13px] font-medium transition",
        active ? "border-ink bg-ink text-sky" : "border-line bg-paper text-mist hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "h-10 rounded-[8px] border border-line bg-paper px-3 text-sm text-ink placeholder:text-mist/70 focus:border-orbit focus:outline-none",
        props.className,
      )}
    />
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-panel)] border border-dashed border-line-strong p-6">
      <div className="text-[15px] font-semibold">{title}</div>
      {children && <div className="max-w-xl text-sm leading-relaxed text-mist">{children}</div>}
      {action}
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useT(T);
  return (
    <div className="flex items-center gap-3 py-16 text-sm text-mist" role="status">
      <svg width="20" height="20" viewBox="0 0 20 20" className="animate-spin motion-reduce:animate-none" aria-hidden>
        <circle cx="10" cy="10" r="7.5" fill="none" stroke="var(--line)" strokeWidth="2.5" />
        <path d="M10 2.5 A7.5 7.5 0 0 1 17.5 10" fill="none" stroke="var(--orbit)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {label ?? t("loading")}
    </div>
  );
}

/** Tray-with-arrow icon for import actions. */
export function ImportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" />
    </svg>
  );
}

/** Orbit logo: ring, one note arc and a satellite dot. */
export function OrbitGlyph({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
      <path d="M6.5 10.5 A 11 11 0 0 1 21.5 6.4" fill="none" stroke="var(--orbit)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.2" fill="currentColor" />
      <circle cx="26.5" cy="21" r="2" fill="currentColor" fillOpacity="0.55" />
    </svg>
  );
}
