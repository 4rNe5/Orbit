"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp, type Profile } from "@/components/app-provider";
import { Button, ButtonLink, Loading, PageHeader, Panel, Segmented } from "@/components/ui";
import { HandleField, NAME_MAX, NicknameField, useHandleStatus, VisibilityField } from "@/components/profile-fields";
import { LanguageSwitcher } from "@/components/language-switcher";
import { defineDict, useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

const T = defineDict({
  ko: {
    loadingProfile: "프로필을 불러오는 중",
    handleTaken: "이미 쓰이는 아이디예요. 다른 아이디를 입력해 주세요.",
    saveFailed: "저장하지 못했습니다. {msg}",
    saved: "프로필을 저장했습니다.",
    profile: "프로필",
    showCompletion: "공개 프로필과 랭킹에 완성도 표시",
    saving: "저장하는 중",
    save: "프로필 저장",
    viewProfile: "내 프로필 보기",
    title: "설정",
    display: "화면",
    theme: "테마",
    themeSystem: "기기 설정",
    themeLight: "낮",
    themeDark: "밤",
    account: "계정",
    socialAccount: "소셜 계정으로 로그인됨",
    notSignedIn: "로그인하지 않았습니다. 점수는 이 기기에만 저장됩니다.",
    signOut: "로그아웃",
    signIn: "로그인",
  },
  ja: {
    loadingProfile: "プロフィールを読み込み中",
    handleTaken: "この ID はすでに使われています。別の ID を入力してください。",
    saveFailed: "保存できませんでした。{msg}",
    saved: "プロフィールを保存しました。",
    profile: "プロフィール",
    showCompletion: "公開プロフィールとランキングに完成度を表示",
    saving: "保存中",
    save: "プロフィールを保存",
    viewProfile: "自分のプロフィールを見る",
    title: "設定",
    display: "表示",
    theme: "テーマ",
    themeSystem: "端末の設定",
    themeLight: "昼",
    themeDark: "夜",
    account: "アカウント",
    socialAccount: "ソーシャルアカウントでログイン中",
    notSignedIn: "ログインしていません。スコアはこの端末にのみ保存されます。",
    signOut: "ログアウト",
    signIn: "ログイン",
  },
  zh: {
    loadingProfile: "正在加载个人资料",
    handleTaken: "此 ID 已被使用，请换一个。",
    saveFailed: "保存失败。{msg}",
    saved: "个人资料已保存。",
    profile: "个人资料",
    showCompletion: "在公开个人资料和排行榜中显示完成度",
    saving: "正在保存",
    save: "保存个人资料",
    viewProfile: "查看我的个人资料",
    title: "设置",
    display: "显示",
    theme: "主题",
    themeSystem: "跟随系统",
    themeLight: "白天",
    themeDark: "夜间",
    account: "账号",
    socialAccount: "已通过社交账号登录",
    notSignedIn: "尚未登录。分数只保存在此设备上。",
    signOut: "退出登录",
    signIn: "登录",
  },
});

type Theme = "system" | "light" | "dark";

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    let saved: Theme = "system";
    try {
      saved = (localStorage.getItem("orbit:theme") as Theme) || "system";
    } catch {
      /* default */
    }
    void Promise.resolve().then(() => setTheme(saved));
  }, []);
  const set = (t: Theme) => {
    setTheme(t);
    try {
      if (t === "system") localStorage.removeItem("orbit:theme");
      else localStorage.setItem("orbit:theme", t);
    } catch {
      /* not persisted */
    }
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  };
  return [theme, set];
}

function ProfileForm() {
  const { profile, session } = useApp();
  const t = useT(T);
  if (!session) return null;
  if (!profile) return <Loading label={t("loadingProfile")} />;
  return <ProfileFields key={`${profile.handle}|${profile.display_name}|${profile.is_public}|${profile.show_completion}`} profile={profile} />;
}

function ProfileFields({ profile }: { profile: Profile }) {
  const { refreshProfile, toast } = useApp();
  const t = useT(T);
  const [name, setName] = useState(profile.display_name);
  const [handle, setHandle] = useState(profile.handle);
  const [pub, setPub] = useState(profile.is_public);
  const [showC, setShowC] = useState(profile.show_completion);
  const [saving, setSaving] = useState(false);
  const status = useHandleStatus(handle, profile.handle);
  const handleOk = status === "ok" || status === "unknown";

  const save = async () => {
    setSaving(true);
    const { error } = await supabase()
      .from("profiles")
      .update({ display_name: name.trim().slice(0, NAME_MAX), handle, is_public: pub, show_completion: showC, onboarded: true })
      .eq("user_id", profile.user_id);
    setSaving(false);
    if (error) {
      toast(error.code === "23505" ? t("handleTaken") : t("saveFailed", { msg: error.message }), "error");
      return;
    }
    await refreshProfile();
    toast(t("saved"));
  };

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">{t("profile")}</h2>
      <div className="mt-4 grid gap-4 sm:max-w-md">
        <NicknameField value={name} onChange={setName} />
        <HandleField value={handle} onChange={setHandle} status={status} />
        <VisibilityField value={pub} onChange={setPub} />
        <label className="flex items-start gap-3 text-[14px]">
          <input type="checkbox" checked={showC} onChange={(e) => setShowC(e.target.checked)} className="mt-1 accent-[var(--orbit)]" />
          <span>{t("showCompletion")}</span>
        </label>
        <div className="flex gap-2">
          <Button variant="primary" onClick={save} disabled={saving || !handleOk}>
            {saving ? t("saving") : t("save")}
          </Button>
          <Link href={`/u/${profile.handle}`} className="inline-flex h-10 items-center px-2 text-[13px] font-medium text-orbit hover:underline">
            {t("viewProfile")}
          </Link>
        </div>
      </div>
    </Panel>
  );
}

export default function SettingsPage() {
  const { ready, session, signOut } = useApp();
  const [theme, setTheme] = useTheme();
  const t = useT(T);
  if (!ready) return <Loading />;
  return (
    <div>
      <PageHeader title={t("title")} />
      <div className="flex flex-col gap-4">
        <ProfileForm />
        <Panel className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">{t("display")}</h2>
          <div className="mt-3">
            <Segmented<Theme>
              label={t("theme")}
              value={theme}
              onChange={setTheme}
              options={[
                { value: "system", label: t("themeSystem") },
                { value: "light", label: t("themeLight") },
                { value: "dark", label: t("themeDark") },
              ]}
            />
          </div>
          <div className="mt-3">
            <LanguageSwitcher variant="inline" />
          </div>
        </Panel>
        <Panel className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
          <div>
            <h2 className="text-[17px] font-semibold">{t("account")}</h2>
            <p className="mt-1 text-[14px] text-mist">{session ? session.user.email ?? t("socialAccount") : t("notSignedIn")}</p>
          </div>
          {session ? <Button onClick={signOut}>{t("signOut")}</Button> : <ButtonLink href="/login" variant="primary">{t("signIn")}</ButtonLink>}
        </Panel>
      </div>
    </div>
  );
}
