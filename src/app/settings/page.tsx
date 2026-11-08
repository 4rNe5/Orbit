"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp, type Profile } from "@/components/app-provider";
import { Button, ButtonLink, Loading, PageHeader, Panel, Segmented, TextInput } from "@/components/ui";
import { LanguageSwitcher } from "@/components/language-switcher";
import { defineDict, useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

const T = defineDict({
  ko: {
    loadingProfile: "프로필을 불러오는 중",
    handleTaken: "이미 쓰이는 주소입니다. 다른 주소를 입력해 주세요.",
    saveFailed: "저장하지 못했습니다. {msg}",
    saved: "프로필을 저장했습니다.",
    profile: "프로필",
    displayName: "표시 이름",
    handle: "프로필 주소",
    handleRule: "영문 소문자·숫자·-·_ 3–24자, 첫 글자는 영문이나 숫자",
    makePublic: "프로필 공개",
    makePublicHint: "켜면 랭킹에 오르고, 프로필 주소로 누구나 B40과 점수를 볼 수 있습니다.",
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
    handleTaken: "この URL はすでに使われています。別の URL を入力してください。",
    saveFailed: "保存できませんでした。{msg}",
    saved: "プロフィールを保存しました。",
    profile: "プロフィール",
    displayName: "表示名",
    handle: "プロフィール URL",
    handleRule: "半角英小文字・数字・-・_ で3〜24文字、先頭は英字か数字",
    makePublic: "プロフィールを公開",
    makePublicHint: "オンにするとランキングに掲載され、プロフィール URL から誰でも B40 とスコアを見られます。",
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
    handleTaken: "该地址已被使用，请换一个地址。",
    saveFailed: "保存失败。{msg}",
    saved: "个人资料已保存。",
    profile: "个人资料",
    displayName: "显示名称",
    handle: "个人资料地址",
    handleRule: "小写字母、数字、- 和 _，3–24 个字符，首字符须为字母或数字",
    makePublic: "公开个人资料",
    makePublicHint: "开启后会出现在排行榜上，任何人都能通过个人资料地址查看你的 B40 和分数。",
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

const HANDLE = /^[a-z0-9][a-z0-9_-]{2,23}$/;

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
  const handleOk = HANDLE.test(handle);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase()
      .from("profiles")
      .update({ display_name: name.trim().slice(0, 40), handle, is_public: pub, show_completion: showC })
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
        <label className="flex flex-col gap-1.5 text-[13px] text-mist">
          {t("displayName")}
          <TextInput value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-mist">
          {t("handle")}
          <div className="flex items-center gap-1 text-ink">
            <span className="text-mist">/u/</span>
            <TextInput value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} aria-invalid={!handleOk} className="flex-1" />
          </div>
          {!handleOk && <span className="text-[12px] text-danger">{t("handleRule")}</span>}
        </label>
        <label className="flex items-start gap-3 text-[14px]">
          <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="mt-1 accent-[var(--orbit)]" />
          <span>
            {t("makePublic")}
            <span className="block text-[12px] text-mist">{t("makePublicHint")}</span>
          </span>
        </label>
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
