"use client";

import { useEffect, useRef, useState } from "react";
import { defineDict, useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useApp, type Profile } from "./app-provider";
import { HandleField, NAME_MAX, NicknameField, useHandleStatus, VisibilityField } from "./profile-fields";
import { Button, OrbitGlyph } from "./ui";

const T = defineDict({
  ko: {
    title: "프로필을 정해 주세요",
    lead: "처음 한 번만 물어볼게요. 나중에 설정에서 언제든 바꿀 수 있어요.",
    start: "시작하기",
    saving: "저장하는 중",
    later: "나중에 하기",
    laterHint: "지금 값 그대로, 비공개로 시작해요.",
    nameRequired: "닉네임을 입력해 주세요.",
    taken: "이미 쓰이는 아이디예요. 다른 아이디를 입력해 주세요.",
    failed: "저장하지 못했어요. {msg}",
    saved: "프로필을 저장했어요.",
  },
  ja: {
    title: "プロフィールを設定しましょう",
    lead: "最初の一度だけ聞きます。あとから設定でいつでも変更できます。",
    start: "はじめる",
    saving: "保存中",
    later: "あとで",
    laterHint: "今の内容のまま、非公開ではじめます。",
    nameRequired: "ニックネームを入力してください。",
    taken: "この ID はすでに使われています。別の ID を入力してください。",
    failed: "保存できませんでした。{msg}",
    saved: "プロフィールを保存しました。",
  },
  zh: {
    title: "设置你的个人资料",
    lead: "只在第一次询问。之后可以随时在设置中修改。",
    start: "开始使用",
    saving: "正在保存",
    later: "稍后再说",
    laterHint: "保持当前内容，以不公开状态开始。",
    nameRequired: "请输入昵称。",
    taken: "此 ID 已被使用，请换一个。",
    failed: "保存失败。{msg}",
    saved: "个人资料已保存。",
  },
});

/** First sign-in: nickname, handle and visibility in one step. Shown until profiles.onboarded is true. */
export function ProfileSetup() {
  const { session, profile } = useApp();
  if (!session || !profile || profile.onboarded) return null;
  return <SetupDialog key={profile.user_id} profile={profile} />;
}

function SetupDialog({ profile }: { profile: Profile }) {
  const { refreshProfile, toast } = useApp();
  const t = useT(T);
  const [name, setName] = useState(profile.display_name);
  const [handle, setHandle] = useState(profile.handle);
  const [pub, setPub] = useState(profile.is_public);
  const [busy, setBusy] = useState<"save" | "later" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = useHandleStatus(handle, profile.handle);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const write = async (patch: Partial<Profile>, kind: "save" | "later") => {
    setBusy(kind);
    setError(null);
    const { error } = await supabase()
      .from("profiles")
      .update({ ...patch, onboarded: true })
      .eq("user_id", profile.user_id);
    if (error) {
      setBusy(null);
      setError(error.code === "23505" ? t("taken") : t("failed", { msg: error.message }));
      return;
    }
    await refreshProfile();
    if (kind === "save") toast(t("saved"));
  };

  const trimmed = name.trim().slice(0, NAME_MAX);
  const canSave = !busy && (status === "ok" || status === "unknown");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal aria-labelledby="setup-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed) return setError(t("nameRequired"));
          if (canSave) void write({ display_name: trimmed, handle, is_public: pub }, "save");
        }}
        className="pop max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[22px] border border-line bg-paper p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-[0_24px_60px_-20px_rgba(15,30,51,0.45)] sm:rounded-[22px] sm:pb-6"
      >
        <div className="flex items-center gap-2 text-ink">
          <OrbitGlyph size={24} />
          <h2 id="setup-title" ref={heading} tabIndex={-1} className="text-[20px] font-bold tracking-[-0.01em] outline-none">
            {t("title")}
          </h2>
        </div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-mist">{t("lead")}</p>

        <div className="mt-5 flex flex-col gap-4">
          <NicknameField value={name} onChange={setName} />
          <HandleField value={handle} onChange={setHandle} status={status} />
          <VisibilityField value={pub} onChange={setPub} />
        </div>

        {error && (
          <p className="mt-4 text-[13px] text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button type="submit" variant="primary" disabled={!canSave} className="w-full">
            {busy === "save" ? t("saving") : t("start")}
          </Button>
          <Button type="button" variant="ghost" disabled={!!busy} onClick={() => void write({}, "later")} className="w-full">
            {t("later")}
          </Button>
          <p className="text-center text-[12px] text-mist">{t("laterHint")}</p>
        </div>
      </form>
    </div>
  );
}
