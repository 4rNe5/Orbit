"use client";

import { useEffect, useState } from "react";
import { defineDict, useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { cx, TextInput } from "./ui";

/** Same rule as the profiles.handle check constraint. */
export const HANDLE = /^[a-z0-9][a-z0-9_-]{2,23}$/;
export const NAME_MAX = 40;

const T = defineDict({
  ko: {
    nickname: "닉네임",
    nicknameHint: "랭킹과 공개 프로필에 보이는 이름이에요.",
    handle: "아이디",
    handleHint: "프로필 주소가 돼요: {url}",
    handleRule: "영문 소문자·숫자·-·_ 3–24자, 첫 글자는 영문이나 숫자",
    checking: "확인하는 중…",
    available: "쓸 수 있는 아이디예요.",
    taken: "이미 쓰이는 아이디예요.",
    visibility: "프로필 공개",
    public: "공개",
    publicHint: "랭킹에 오르고, 누구나 프로필 주소로 B40과 점수를 볼 수 있어요.",
    private: "비공개",
    privateHint: "점수는 나만 봐요. 랭킹에 오르지 않아요.",
  },
  ja: {
    nickname: "ニックネーム",
    nicknameHint: "ランキングと公開プロフィールに表示される名前です。",
    handle: "ID",
    handleHint: "プロフィール URL になります: {url}",
    handleRule: "半角英小文字・数字・-・_ で3〜24文字、先頭は英字か数字",
    checking: "確認中…",
    available: "この ID は使えます。",
    taken: "この ID はすでに使われています。",
    visibility: "プロフィールの公開",
    public: "公開",
    publicHint: "ランキングに掲載され、プロフィール URL から誰でも B40 とスコアを見られます。",
    private: "非公開",
    privateHint: "スコアは自分だけが見られます。ランキングには載りません。",
  },
  zh: {
    nickname: "昵称",
    nicknameHint: "显示在排行榜和公开主页上的名字。",
    handle: "ID",
    handleHint: "将作为个人主页地址：{url}",
    handleRule: "小写字母、数字、- 和 _，3–24 个字符，首字符须为字母或数字",
    checking: "检查中…",
    available: "此 ID 可以使用。",
    taken: "此 ID 已被使用。",
    visibility: "主页公开设置",
    public: "公开",
    publicHint: "会出现在排行榜上，任何人都能通过主页地址查看你的 B40 和分数。",
    private: "不公开",
    privateHint: "分数只有自己能看到，不会出现在排行榜上。",
  },
});

export type HandleStatus = "invalid" | "checking" | "ok" | "taken" | "unknown";

/** Live availability of a handle (debounced RPC). The user's current handle is always "ok". */
export function useHandleStatus(handle: string, current: string): HandleStatus {
  const [res, setRes] = useState<{ h: string; ok: boolean | null }>({ h: "", ok: null });
  const valid = HANDLE.test(handle);
  const same = handle === current;
  useEffect(() => {
    if (!valid || same) return;
    let live = true;
    const id = setTimeout(async () => {
      const { data, error } = await supabase().rpc("handle_available", { candidate: handle });
      if (live) setRes({ h: handle, ok: error ? null : Boolean(data) });
    }, 350);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [handle, valid, same]);
  if (!valid) return "invalid";
  if (same) return "ok";
  if (res.h !== handle) return "checking";
  return res.ok === null ? "unknown" : res.ok ? "ok" : "taken";
}

export function NicknameField({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const t = useT(T);
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-mist">
      <span className="font-medium text-ink-2">{t("nickname")}</span>
      <TextInput value={value} maxLength={NAME_MAX} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} autoComplete="nickname" />
      <span className="text-[12px]">{t("nicknameHint")}</span>
    </label>
  );
}

export function HandleField({ value, onChange, status }: { value: string; onChange: (v: string) => void; status: HandleStatus }) {
  const t = useT(T);
  const url = `orbit-rating.vercel.app/u/${value || "…"}`;
  const msg =
    status === "invalid" ? (
      <span className="text-danger">{t("handleRule")}</span>
    ) : status === "taken" ? (
      <span className="text-danger">{t("taken")}</span>
    ) : status === "checking" ? (
      <span>{t("checking")}</span>
    ) : status === "ok" ? (
      <span className="text-orbit">{t("available")}</span>
    ) : null;
  return (
    <label className="flex flex-col gap-1.5 text-[13px] text-mist">
      <span className="font-medium text-ink-2">{t("handle")}</span>
      <div className="flex items-center gap-1 text-ink">
        <span className="text-mist">/u/</span>
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s+/g, ""))}
          aria-invalid={status === "invalid" || status === "taken"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1"
        />
      </div>
      <span className="text-[12px]" aria-live="polite">
        {msg}
      </span>
      <span className="break-all text-[12px]">{t("handleHint", { url })}</span>
    </label>
  );
}

export function VisibilityField({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const t = useT(T);
  const opts = [
    { v: false, label: t("private"), hint: t("privateHint") },
    { v: true, label: t("public"), hint: t("publicHint") },
  ];
  return (
    <div className="flex flex-col gap-1.5 text-[13px]">
      <span className="font-medium text-ink-2">{t("visibility")}</span>
      <div role="radiogroup" aria-label={t("visibility")} className="grid gap-2 sm:grid-cols-2">
        {opts.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
            className={cx(
              "rounded-[12px] border p-3 text-left transition",
              value === o.v ? "border-orbit bg-orbit-soft" : "border-line bg-paper hover:border-line-strong",
            )}
          >
            <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <span className={cx("grid h-4 w-4 place-items-center rounded-full border", value === o.v ? "border-orbit" : "border-line-strong")}>
                {value === o.v && <span className="h-2 w-2 rounded-full bg-orbit" />}
              </span>
              {o.label}
            </span>
            <span className="mt-1 block text-[12px] leading-relaxed text-mist">{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
