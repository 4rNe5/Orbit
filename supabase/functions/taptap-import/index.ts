// TapTap → Rotaeno cloud save import.
// The browser only ever receives QR data and parsed score records; TapTap tokens and the
// LeanCloud session token live for one request inside this function and are never stored or logged.
//
// Secrets (supabase secrets set …):
//   TAPTAP_CLIENT_ID_GLOBAL, TAPTAP_CLIENT_ID_CN, ROTAENO_LC_KEY_GLOBAL, ROTAENO_LC_KEY_CN
import { crypto } from "jsr:@std/crypto@1";
import { encodeHex } from "jsr:@std/encoding@1/hex";

type Region = "global" | "cn";

const CONFIG: Record<Region, { lcId: string; lcServer: string; codeUrl: string; tokenUrl: string; unionUrl: string; unionAppId: string }> = {
  global: {
    lcId: "wsNh5k0vbzxei1fsF0KC6dCG-MdYXbMMI",
    lcServer: "https://leanapi.rotaeno.com",
    codeUrl: "https://accounts.tapapis.com/oauth2/v1/device/code",
    tokenUrl: "https://accounts.tapapis.com/oauth2/v1/token",
    unionUrl: "https://xdsdk-os-prod-gateway.xd.com/api/login/v1/union",
    unionAppId: "2023001",
  },
  cn: {
    lcId: "OLNEwJ5x64vEP7QNw2yt8heM-gzGzoHsz",
    lcServer: "https://rotaeno.leancloud.indie.xd.com",
    codeUrl: "https://accounts.tapapis.cn/oauth2/v1/device/code",
    tokenUrl: "https://accounts.tapapis.cn/oauth2/v1/token",
    unionUrl: "https://xdsdk-cn-prod-gateway.xd.cn/api/login/v1/union",
    unionAppId: "2076001",
  },
};

const LEVELS: Record<string, string> = { I: "I", II: "II", III: "III", IV: "IV", IV_Alpha: "IV-α" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function secret(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`서버 설정이 끝나지 않았습니다 (${name}).`);
  return v;
}

function clientId(r: Region) {
  return secret(r === "cn" ? "TAPTAP_CLIENT_ID_CN" : "TAPTAP_CLIENT_ID_GLOBAL");
}
function lcKey(r: Region) {
  return secret(r === "cn" ? "ROTAENO_LC_KEY_CN" : "ROTAENO_LC_KEY_GLOBAL");
}

async function lcSign(key: string) {
  const ts = Date.now().toString();
  const digest = await crypto.subtle.digest("MD5", new TextEncoder().encode(ts + key));
  return `${encodeHex(new Uint8Array(digest))},${ts}`;
}

async function form(url: string, params: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  return res.json();
}

async function start(region: Region) {
  const deviceId = crypto.randomUUID().replaceAll("-", "");
  const r = await form(CONFIG[region].codeUrl, {
    client_id: clientId(region),
    response_type: "device_code",
    scope: "public_profile",
    version: "2.1",
    platform: "unity",
    info: JSON.stringify({ device_id: deviceId }),
  });
  if (!r?.data?.device_code) throw new Error("TapTap 로그인 QR을 만들지 못했습니다.");
  return {
    deviceId,
    deviceCode: r.data.device_code as string,
    qrcodeUrl: r.data.qrcode_url as string,
    interval: Number(r.data.interval ?? 3),
    expiresIn: Number(r.data.expires_in ?? 60),
  };
}

function lampOf(flag: unknown, score: number): "none" | "fc" | "ap" {
  if (score >= 1_010_000) return "ap";
  const f = String(flag ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (f.includes("app") || f.includes("allperfect") || f === "ap") return "ap";
  if (f.includes("fc") || f.includes("fullcombo")) return "fc";
  return "none";
}

async function poll(region: Region, deviceCode: string, deviceId: string) {
  const cfg = CONFIG[region];
  const token = await form(cfg.tokenUrl, {
    grant_type: "device_token",
    client_id: clientId(region),
    secret_type: "hmac-sha-1",
    code: deviceCode,
    version: "1.0",
    platform: "unity",
    info: JSON.stringify({ device_id: deviceId }),
  });
  const data = token?.data ?? {};
  if (!data.kid || !data.mac_key) {
    const err = String(data.error ?? "");
    if (err === "authorization_pending" || err === "authorization_waiting") return { status: "pending" as const };
    if (err === "") throw new Error(`TapTap 응답을 해석하지 못했습니다 (${Object.keys(token ?? {}).join(",")}).`);
    if (err.includes("expired")) return { status: "expired" as const };
    throw new Error(`TapTap 로그인이 거절되었습니다 (${err}).`);
  }

  const unionUrl = new URL(cfg.unionUrl);
  for (const [k, v] of Object.entries({ pt: "Android", sdkVer: "6.21.1", did: deviceId, sdkLang: "zh_CN", appId: cfg.unionAppId })) unionUrl.searchParams.set(k, v);
  const union = await (
    await fetch(unionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "", grantType: "", origDid: "", scope: "compliance,public_profile", subType: "", token: data.kid, type: "5", secret: data.mac_key }),
    })
  ).json();
  if (!union?.data?.kid) throw new Error("XD 계정 연결에 실패했습니다.");

  const key = lcKey(region);
  const user = await (
    await fetch(`${cfg.lcServer}/1.1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-LC-Id": cfg.lcId, "X-LC-Key": key },
      body: JSON.stringify({ authData: { xdg: { access_token: `${union.data.kid} ${union.data.macKey}`, uid: "should_be_replaced_after_validation", device_id: deviceId } } }),
    })
  ).json();
  if (!user?.sessionToken || !user?.objectId) throw new Error("Rotaeno 계정을 찾지 못했습니다. 게임에서 TapTap 로그인을 한 계정인지 확인해 주세요.");

  const where = encodeURIComponent(JSON.stringify({ user: { __type: "Pointer", className: "_User", objectId: user.objectId } }));
  const save = await (
    await fetch(`${cfg.lcServer}/1.1/classes/CloudSave?where=${where}`, {
      headers: { "X-LC-Id": cfg.lcId, "X-LC-Sign": await lcSign(key), "X-LC-Session": user.sessionToken },
    })
  ).json();
  const cloud = save?.results?.[0]?.cloudSave;
  const body = cloud?.data?.data;
  if (!body?.songs?.songs) throw new Error("클라우드 세이브가 없습니다. 게임에서 클라우드 저장을 한 번 실행해 주세요.");

  const records: { songId: string; difficulty: string; score: number; lamp: "none" | "fc" | "ap" }[] = [];
  for (const [songId, song] of Object.entries<Record<string, unknown>>(body.songs.songs)) {
    const levels = (song?.levels ?? {}) as Record<string, { Score?: number; Flag?: string }>;
    for (const [lv, rec] of Object.entries(levels)) {
      const d = LEVELS[lv];
      const score = Number(rec?.Score ?? 0);
      if (!d || !Number.isFinite(score) || score <= 0) continue;
      records.push({ songId, difficulty: d, score: Math.min(score, 1_010_000), lamp: lampOf(rec?.Flag, score) });
    }
  }
  return { status: "done" as const, displayName: String(body.profile?.DisplayName ?? ""), records };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const { action, region = "global", deviceCode, deviceId } = await req.json();
    const r: Region = region === "cn" ? "cn" : "global";
    if (action === "start") return json(await start(r));
    if (action === "poll") {
      if (typeof deviceCode !== "string" || typeof deviceId !== "string") return json({ error: "deviceCode, deviceId 필요" }, 400);
      return json(await poll(r, deviceCode, deviceId));
    }
    return json({ error: "알 수 없는 요청" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
});
