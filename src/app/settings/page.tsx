"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp, type Profile } from "@/components/app-provider";
import { Button, ButtonLink, Loading, PageHeader, Panel, Segmented, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";

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
  if (!session) return null;
  if (!profile) return <Loading label="프로필을 불러오는 중" />;
  return <ProfileFields key={`${profile.handle}|${profile.display_name}|${profile.is_public}|${profile.show_completion}`} profile={profile} />;
}

function ProfileFields({ profile }: { profile: Profile }) {
  const { refreshProfile, toast } = useApp();
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
      toast(error.code === "23505" ? "이미 쓰이는 주소입니다. 다른 주소를 입력해 주세요." : `저장하지 못했습니다. ${error.message}`, "error");
      return;
    }
    await refreshProfile();
    toast("프로필을 저장했습니다.");
  };

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold">프로필</h2>
      <div className="mt-4 grid gap-4 sm:max-w-md">
        <label className="flex flex-col gap-1.5 text-[13px] text-mist">
          표시 이름
          <TextInput value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-mist">
          프로필 주소
          <div className="flex items-center gap-1 text-ink">
            <span className="text-mist">/u/</span>
            <TextInput value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} aria-invalid={!handleOk} className="flex-1" />
          </div>
          {!handleOk && <span className="text-[12px] text-danger">영문 소문자·숫자·-·_ 3–24자, 첫 글자는 영문이나 숫자</span>}
        </label>
        <label className="flex items-start gap-3 text-[14px]">
          <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="mt-1 accent-[var(--orbit)]" />
          <span>
            프로필 공개
            <span className="block text-[12px] text-mist">켜면 랭킹에 오르고, 프로필 주소로 누구나 B40과 점수를 볼 수 있습니다.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-[14px]">
          <input type="checkbox" checked={showC} onChange={(e) => setShowC(e.target.checked)} className="mt-1 accent-[var(--orbit)]" />
          <span>공개 프로필과 랭킹에 완성도 표시</span>
        </label>
        <div className="flex gap-2">
          <Button variant="primary" onClick={save} disabled={saving || !handleOk}>
            {saving ? "저장하는 중" : "프로필 저장"}
          </Button>
          <Link href={`/u/${profile.handle}`} className="inline-flex h-10 items-center px-2 text-[13px] font-medium text-orbit hover:underline">
            내 프로필 보기
          </Link>
        </div>
      </div>
    </Panel>
  );
}

export default function SettingsPage() {
  const { ready, session, signOut } = useApp();
  const [theme, setTheme] = useTheme();
  if (!ready) return <Loading />;
  return (
    <div>
      <PageHeader title="설정" />
      <div className="flex flex-col gap-4">
        <ProfileForm />
        <Panel className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">화면</h2>
          <div className="mt-3">
            <Segmented<Theme>
              label="테마"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "system", label: "기기 설정" },
                { value: "light", label: "낮" },
                { value: "dark", label: "밤" },
              ]}
            />
          </div>
        </Panel>
        <Panel className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
          <div>
            <h2 className="text-[17px] font-semibold">계정</h2>
            <p className="mt-1 text-[14px] text-mist">{session ? session.user.email ?? "소셜 계정으로 로그인됨" : "로그인하지 않았습니다. 점수는 이 기기에만 저장됩니다."}</p>
          </div>
          {session ? <Button onClick={signOut}>로그아웃</Button> : <ButtonLink href="/login" variant="primary">로그인</ButtonLink>}
        </Panel>
      </div>
    </div>
  );
}
