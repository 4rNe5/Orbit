"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useApp } from "./app-provider";
import { cx, OrbitGlyph } from "./ui";

const MAIN = [
  { href: "/", label: "홈" },
  { href: "/scores", label: "점수" },
  { href: "/best", label: "B40" },
  { href: "/targets", label: "대상곡" },
  { href: "/completion", label: "완성도" },
  { href: "/history", label: "기록" },
  { href: "/tools", label: "도구" },
  { href: "/ranking", label: "랭킹" },
];

const MOBILE = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/scores", label: "점수", icon: "list" },
  { href: "/best", label: "B40", icon: "orbit" },
  { href: "/targets", label: "대상곡", icon: "target" },
] as const;

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function Icon({ name }: { name: string }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      {name === "home" && <path {...s} d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />}
      {name === "list" && <path {...s} d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />}
      {name === "orbit" && (
        <>
          <circle {...s} cx="12" cy="12" r="8" />
          <path {...s} d="M5.5 8.2A8 8 0 0 1 15.8 5" strokeWidth={3} />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </>
      )}
      {name === "target" && (
        <>
          <circle {...s} cx="12" cy="12" r="8" />
          <circle {...s} cx="12" cy="12" r="4" />
          <path {...s} d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </>
      )}
      {name === "more" && <path {...s} d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3} />}
    </svg>
  );
}

function AccountMenu() {
  const { session, profile, signOut, isAdmin, syncing } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!session)
    return (
      <Link href="/login" className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[13px] font-semibold text-sky">
        로그인
      </Link>
    );
  const name = profile?.display_name || session.user.email || "트래블러";
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-full border border-line bg-paper pl-1 pr-3 text-[13px] font-medium"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-orbit-soft text-[12px] font-semibold text-orbit">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-[9rem] truncate">{name}</span>
        {syncing && <span className="h-1.5 w-1.5 rounded-full bg-orbit" title="저장 중" />}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-[12px] border border-line bg-paper py-1 text-sm shadow-[0_12px_32px_-12px_rgba(15,30,51,0.25)]">
          {profile && (
            <Link onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-orbit-soft" href={`/u/${profile.handle}`}>
              내 공개 프로필
            </Link>
          )}
          <Link onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-orbit-soft" href="/import">
            가져오기·내보내기
          </Link>
          <Link onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-orbit-soft" href="/settings">
            설정
          </Link>
          {isAdmin && (
            <Link onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-orbit-soft" href="/admin">
              곡 데이터 관리
            </Link>
          )}
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="block w-full px-4 py-2.5 text-left text-mist hover:bg-orbit-soft hover:text-ink"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  const { session } = useApp();
  const items = [
    { href: "/completion", label: "완성도" },
    { href: "/history", label: "레이팅 기록" },
    { href: "/tools", label: "랜덤·챌린지·정수 연대기" },
    { href: "/ranking", label: "랭킹" },
    { href: "/import", label: "가져오기·내보내기" },
    { href: "/settings", label: "설정" },
    ...(session ? [] : [{ href: "/login", label: "로그인" }]),
  ];
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal aria-label="더보기">
      <button className="absolute inset-0 bg-ink/30" aria-label="닫기" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[20px] border-t border-line bg-paper px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
        {items.map((i) => (
          <Link key={i.href} href={i.href} onClick={onClose} className="block rounded-[10px] px-3 py-3 text-[15px] hover:bg-orbit-soft">
            {i.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function DesktopNav({ path }: { path: string | null }) {
  return (
    <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="주 메뉴">
      {MAIN.map((m) => {
        const on = path !== null && isActive(path, m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={on ? "page" : undefined}
            className={cx("relative rounded-full px-3 py-1.5 text-[14px] transition", on ? "font-semibold text-ink" : "text-mist hover:text-ink")}
          >
            {m.label}
            {on && <span className="absolute inset-x-3 -bottom-[11px] h-[2px] rounded-full bg-orbit" />}
          </Link>
        );
      })}
    </nav>
  );
}
function DesktopNavLive() {
  return <DesktopNav path={usePathname()} />;
}

function MobileNav({ path }: { path: string | null }) {
  return (
    <>
      {MOBILE.map((m) => {
        const on = path !== null && isActive(path, m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={on ? "page" : undefined}
            className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px]", on ? "text-orbit" : "text-mist")}
          >
            <Icon name={m.icon} />
            {m.label}
          </Link>
        );
      })}
    </>
  );
}
function MobileNavLive() {
  return <MobileNav path={usePathname()} />;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { toasts, error, syncError } = useApp();
  const [more, setMore] = useState(false);

  return (
    <div className="starfield min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-paper focus:px-4 focus:py-2">
        본문으로 건너뛰기
      </a>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-sky/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 text-ink" aria-label="Orbit Rating 홈">
            <OrbitGlyph />
            <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">Orbit Rating</span>
          </Link>
          <Suspense fallback={<DesktopNav path={null} />}>
            <DesktopNavLive />
          </Suspense>
          <div className="ml-auto md:ml-0">
            <AccountMenu />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-16 md:pt-10">
        {syncError && <div className="mb-6 rounded-[12px] border border-danger/40 bg-paper p-4 text-sm text-danger">{syncError}</div>}
        {error ? <div className="rounded-[12px] border border-danger/40 bg-paper p-4 text-sm text-danger">{error}</div> : children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="하단 메뉴"
      >
        <div className="grid grid-cols-5">
          <Suspense fallback={<MobileNav path={null} />}>
            <MobileNavLive />
          </Suspense>
          <button onClick={() => setMore(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-mist">
            <Icon name="more" />
            더보기
          </button>
        </div>
      </nav>
      {more && <MoreSheet onClose={() => setMore(false)} />}

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "pointer-events-auto max-w-md rounded-full border px-4 py-2.5 text-[13px] shadow-[0_10px_30px_-12px_rgba(15,30,51,0.35)]",
              t.tone === "error" ? "border-danger/40 bg-paper text-danger" : "border-line bg-ink text-sky",
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
