"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { defineDict, LOCALES, setLocale, useLocale, useT } from "@/lib/i18n";
import { useApp } from "./app-provider";
import { LanguageSwitcher } from "./language-switcher";
import { GoogleOneTap } from "./one-tap";
import { ProfileSetup } from "./profile-setup";
import { cx, OrbitGlyph } from "./ui";

const T = defineDict({
  ko: {
    home: "홈", scores: "점수", best: "B40", targets: "대상곡", completion: "완성도", insights: "성향", history: "기록", tools: "도구", ranking: "랭킹", songs: "악곡",
    login: "로그인", logout: "로그아웃", saving: "저장 중", myProfile: "내 공개 프로필", importExport: "가져오기·내보내기", settings: "설정", admin: "곡 데이터 관리",
    ratingHistory: "레이팅 기록", toolsLong: "랜덤·챌린지·정수 연대기", more: "더보기", close: "닫기", skip: "본문으로 건너뛰기", mainNav: "주 메뉴", bottomNav: "하단 메뉴",
    homeLabel: "Orbit Rating 홈", traveler: "트래블러", language: "언어",
  },
  ja: {
    home: "ホーム", scores: "スコア", best: "B40", targets: "対象曲", completion: "完成度", insights: "傾向", history: "履歴", tools: "ツール", ranking: "ランキング", songs: "楽曲",
    login: "ログイン", logout: "ログアウト", saving: "保存中", myProfile: "公開プロフィール", importExport: "インポート・エクスポート", settings: "設定", admin: "楽曲データ管理",
    ratingHistory: "レート履歴", toolsLong: "ランダム・チャレンジ・定数の変遷", more: "その他", close: "閉じる", skip: "本文へスキップ", mainNav: "メインメニュー", bottomNav: "下部メニュー",
    homeLabel: "Orbit Rating ホーム", traveler: "トラベラー", language: "言語",
  },
  zh: {
    home: "首页", scores: "分数", best: "B40", targets: "推分目标", completion: "完成度", insights: "倾向", history: "记录", tools: "工具", ranking: "排行榜", songs: "曲目",
    login: "登录", logout: "退出登录", saving: "保存中", myProfile: "我的公开主页", importExport: "导入·导出", settings: "设置", admin: "曲目数据管理",
    ratingHistory: "Rating 记录", toolsLong: "随机·挑战·定数变化史", more: "更多", close: "关闭", skip: "跳到正文", mainNav: "主菜单", bottomNav: "底部菜单",
    homeLabel: "Orbit Rating 首页", traveler: "旅行者", language: "语言",
  },
});
type K = keyof typeof T.ko;

/** Desktop top bar: everyday pages first, the rest under "more". */
const MAIN: { href: string; key: K }[] = [
  { href: "/", key: "home" },
  { href: "/scores", key: "scores" },
  { href: "/best", key: "best" },
  { href: "/targets", key: "targets" },
  { href: "/songs", key: "songs" },
  { href: "/ranking", key: "ranking" },
];
const EXTRA: { href: string; key: K }[] = [
  { href: "/completion", key: "completion" },
  { href: "/insights", key: "insights" },
  { href: "/history", key: "ratingHistory" },
  { href: "/tools", key: "toolsLong" },
];

const MOBILE = [
  { href: "/", key: "home", icon: "home" },
  { href: "/scores", key: "scores", icon: "list" },
  { href: "/best", key: "best", icon: "orbit" },
  { href: "/targets", key: "targets", icon: "target" },
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
      {name === "globe" && (
        <>
          <circle {...s} cx="12" cy="12" r="8.5" />
          <path {...s} d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5z" />
        </>
      )}
    </svg>
  );
}

/** Compact language picker for the header. */
function LanguageMenu() {
  const l = useLocale();
  const t = useT(T);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${t("language")}: ${LOCALES.find((x) => x.id === l)?.label}`}
        className="flex h-9 items-center gap-1 rounded-[8px] px-2 text-[12px] font-semibold uppercase text-mist hover:text-ink"
      >
        <Icon name="globe" />
        <span className="hidden sm:inline">{l}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-36 overflow-hidden rounded-[8px] border border-line bg-paper py-1 text-sm shadow-[0_8px_24px_-12px_rgba(15,30,51,0.3)]" role="menu">
          {LOCALES.map((x) => (
            <button
              key={x.id}
              role="menuitemradio"
              aria-checked={l === x.id}
              lang={x.html}
              onClick={() => {
                setLocale(x.id);
                setOpen(false);
              }}
              className={cx("block w-full px-4 py-2.5 text-left hover:bg-orbit-soft", l === x.id && "font-semibold text-orbit")}
            >
              {x.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const { session, profile, signOut, isAdmin, syncing } = useApp();
  const t = useT(T);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!session)
    return (
      <Link href="/login" className="inline-flex h-9 items-center rounded-[8px] bg-ink px-4 text-[13px] font-semibold text-sky">
        {t("login")}
      </Link>
    );
  const name = profile?.display_name || session.user.email || t("traveler");
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-[8px] border border-line bg-paper pl-1 pr-3 text-[13px] font-medium"
      >
        <span className="grid h-7 w-7 place-items-center rounded-[6px] bg-orbit-soft text-[12px] font-semibold text-orbit">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-[9rem] truncate">{name}</span>
        {syncing && <span className="h-1.5 w-1.5 rounded-full bg-orbit" title={t("saving")} />}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-[8px] border border-line bg-paper py-1 text-sm shadow-[0_8px_24px_-12px_rgba(15,30,51,0.3)]">
          {profile && (
            <Link onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-orbit-soft" href={`/u/${profile.handle}`}>
              {t("myProfile")}
            </Link>
          )}
          <Link onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-orbit-soft" href="/import">
            {t("importExport")}
          </Link>
          <Link onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-orbit-soft" href="/settings">
            {t("settings")}
          </Link>
          {isAdmin && (
            <Link onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-orbit-soft" href="/admin">
              {t("admin")}
            </Link>
          )}
          <button
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="block w-full px-4 py-2.5 text-left text-mist hover:bg-orbit-soft hover:text-ink"
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  const { session } = useApp();
  const t = useT(T);
  const items: { href: string; key: K }[] = [
    { href: "/songs", key: "songs" },
    { href: "/ranking", key: "ranking" },
    ...EXTRA,
    { href: "/import", key: "importExport" },
    { href: "/settings", key: "settings" },
    ...(session ? [] : [{ href: "/login", key: "login" as K }]),
  ];
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label={t("more")}>
      <button className="absolute inset-0 bg-ink/30" aria-label={t("close")} onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[14px] border-t border-line bg-paper px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
        <div className="mb-2 flex justify-center">
          <LanguageSwitcher />
        </div>
        {items.map((i) => (
          <Link key={i.href} href={i.href} onClick={onClose} className="block rounded-[8px] px-3 py-3 text-[15px] hover:bg-orbit-soft">
            {t(i.key)}
          </Link>
        ))}
      </div>
    </div>
  );
}

function NavMore({ path }: { path: string | null }) {
  const t = useT(T);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = EXTRA.find((m) => path !== null && isActive(path, m.href));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cx("relative flex items-center gap-1 whitespace-nowrap px-3 py-1.5 text-[14px] transition", current ? "font-semibold text-ink" : "text-mist hover:text-ink")}
      >
        {current ? t(current.key === "ratingHistory" ? "history" : current.key === "toolsLong" ? "tools" : current.key) : t("more")}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden className={cx("transition", open && "rotate-180")}>
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {current && <span className="absolute inset-x-3 -bottom-[11px] h-[2px] bg-orbit" />}
      </button>
      {open && (
        <div className="absolute left-0 z-40 mt-2 w-56 overflow-hidden rounded-[8px] border border-line bg-paper py-1 text-sm shadow-[0_8px_24px_-12px_rgba(15,30,51,0.3)]" role="menu">
          {EXTRA.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              aria-current={current?.href === m.href ? "page" : undefined}
              className={cx("block px-4 py-2.5 hover:bg-orbit-soft", current?.href === m.href && "font-semibold text-orbit")}
            >
              {t(m.key)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DesktopNav({ path }: { path: string | null }) {
  const t = useT(T);
  return (
    <nav className="hidden flex-1 items-center gap-0.5 lg:flex" aria-label={t("mainNav")}>
      {MAIN.map((m) => {
        const on = path !== null && isActive(path, m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={on ? "page" : undefined}
            className={cx("relative whitespace-nowrap px-3 py-1.5 text-[14px] transition", on ? "font-semibold text-ink" : "text-mist hover:text-ink")}
          >
            {t(m.key)}
            {on && <span className="absolute inset-x-3 -bottom-[11px] h-[2px] bg-orbit" />}
          </Link>
        );
      })}
      <NavMore path={path} />
    </nav>
  );
}
function DesktopNavLive() {
  return <DesktopNav path={usePathname()} />;
}

function MobileNav({ path }: { path: string | null }) {
  const t = useT(T);
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
            {t(m.key)}
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
  const t = useT(T);
  const l = useLocale();

  // keep <html lang> in step with the chosen language
  useEffect(() => {
    document.documentElement.lang = LOCALES.find((x) => x.id === l)?.html ?? l;
  }, [l]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-[8px] focus:bg-paper focus:px-4 focus:py-2">
        {t("skip")}
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 text-ink" aria-label={t("homeLabel")}>
            <OrbitGlyph />
            <span className="whitespace-nowrap font-display text-[17px] font-semibold tracking-[-0.02em]">Orbit Rating</span>
          </Link>
          <Suspense fallback={<DesktopNav path={null} />}>
            <DesktopNavLive />
          </Suspense>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <LanguageMenu />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pt-7 lg:pb-16">
        {syncError && <div className="mb-6 rounded-[8px] border border-danger/40 bg-paper p-4 text-sm text-danger">{syncError}</div>}
        {error ? <div className="rounded-[8px] border border-danger/40 bg-paper p-4 text-sm text-danger">{error}</div> : children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label={t("bottomNav")}
      >
        <div className="grid grid-cols-5">
          <Suspense fallback={<MobileNav path={null} />}>
            <MobileNavLive />
          </Suspense>
          <button onClick={() => setMore(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-mist">
            <Icon name="more" />
            {t("more")}
          </button>
        </div>
      </nav>
      {more && <MoreSheet onClose={() => setMore(false)} />}
      <GoogleOneTap />
      <ProfileSetup />

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "pointer-events-auto max-w-md rounded-[8px] border px-4 py-2.5 text-[13px] shadow-[0_8px_24px_-12px_rgba(15,30,51,0.35)]",
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
