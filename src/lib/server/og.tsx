import { ImageResponse } from "next/og";
import sharp from "sharp";
import { tierOf } from "@/lib/tiers";
import { SITE_URL, type PublicSummary } from "./public-summary";

export const OG_SIZE = { width: 1200, height: 630 };

const DIFF: Record<string, string> = { I: "#00ff37", II: "#0080ff", III: "#ff8800", IV: "#a454fa", "IV-α": "#c697f7" };

/** Google Fonts subset for exactly the glyphs on the card (Korean names need it). */
async function font(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`)
    ).text();
    const m = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!m) return null;
    const res = await fetch(m[1]);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

async function fonts(text: string) {
  const [kr, krBold, num] = await Promise.all([font("IBM Plex Sans KR", 500, text), font("IBM Plex Sans KR", 700, text), font("Sora", 700, text)]);
  return [
    kr && { name: "Plex", data: kr, weight: 500 as const, style: "normal" as const },
    krBold && { name: "Plex", data: krBold, weight: 700 as const, style: "normal" as const },
    num && { name: "Sora", data: num, weight: 700 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 500 | 700; style: "normal" }[];
}

function Glyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="19" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="4" />
      <path d="M15.55 22.5 A 19 19 0 0 1 41.5 15.55" fill="none" stroke="#3cb4ff" strokeWidth="7" strokeLinecap="round" />
      <circle cx="32" cy="32" r="5.6" fill="#eef3fb" />
      <circle cx="49.2" cy="40" r="4" fill="#6d8cff" />
    </svg>
  );
}

const asset = (p: string) => `${SITE_URL}${p}`;

/** Satori can't decode WebP: fetch the jacket and hand it over as a PNG data URL. */
async function jacketPng(songId: string): Promise<string | null> {
  try {
    const res = await fetch(asset(`/jackets/${songId}.webp`));
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer())).resize(192, 192).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function profileCard(s: PublicSummary | null, handle: string) {
  if (!s) return siteCard(`@${handle}`);
  const t = tierOf(s.rating);
  const jackets = await Promise.all(s.top.map((x) => jacketPng(x.songId)));
  const text = `Orbit Rating ${s.name} @${s.handle} ${s.rating.toFixed(3)} 입력한 채보 B40 AP+ 상위 0123456789.,·${s.top.map((x) => x.title + x.difficulty).join("")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#060a14", color: "#eef3fb", fontFamily: "Plex", padding: 56, position: "relative" }}>
        <div style={{ position: "absolute", right: -160, top: -220, width: 640, height: 640, borderRadius: 640, background: `linear-gradient(118deg, ${t.dark.join(", ")})`, opacity: 0.28, filter: "blur(90px)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, color: "#b2c0d6", fontWeight: 500 }}>
          <Glyph size={40} />
          Orbit Rating
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 34 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 60, fontWeight: 700, lineHeight: 1.1, maxWidth: 620, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
            <div style={{ display: "flex", fontSize: 26, color: "#7d8ba4", marginTop: 6 }}>{`@${s.handle}`}</div>
            <div style={{ display: "flex", gap: 28, fontSize: 24, color: "#b2c0d6", marginTop: 22 }}>
              <span>{`입력한 채보 ${s.played.toLocaleString()}`}</span>
              <span>{`B40 AP+ ${s.apPlus}`}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset(t.icon)} width={96} height={96} style={{ objectFit: "contain" }} alt="" />
            <div style={{ fontFamily: "Sora", fontSize: 112, fontWeight: 700, letterSpacing: -4, backgroundImage: `linear-gradient(118deg, ${t.dark.join(", ")})`, backgroundClip: "text", color: "transparent" }}>
              {s.rating.toFixed(3)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: "auto" }}>
          {s.top.map((x, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", width: 200 }}>
              <div style={{ display: "flex", position: "relative", width: 200, height: 200, borderRadius: 16, overflow: "hidden", border: `4px solid ${DIFF[x.difficulty]}` }}>
                {jackets[i] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={jackets[i]!} width={192} height={192} style={{ objectFit: "cover" }} alt="" />
                )}
                <div style={{ display: "flex", position: "absolute", left: 0, top: 0, background: DIFF[x.difficulty], color: "#0b0910", fontFamily: "Sora", fontSize: 20, fontWeight: 700, padding: "2px 10px", borderBottomRightRadius: 12 }}>{i + 1}</div>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", padding: "26px 10px 8px", background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))", fontFamily: "Sora", fontSize: 28, fontWeight: 700, color: "#fff" }}>
                  {x.effective.toFixed(3)}
                </div>
              </div>
              <div style={{ display: "flex", fontSize: 18, color: "#b2c0d6", marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.title}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts(text) },
  );
}

export async function siteCard(sub?: string) {
  const text = `Orbit Rating Rotaeno 레이팅·B40·대상곡·완성도 분석 ${sub ?? ""}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: "#060a14", color: "#eef3fb", fontFamily: "Plex", padding: 80, position: "relative" }}>
        <div style={{ display: "flex", position: "absolute", right: -120, top: -200, width: 640, height: 640, borderRadius: 640, background: "linear-gradient(118deg, #3cb4ff, #6d8cff)", opacity: 0.25, filter: "blur(90px)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Glyph size={96} />
          <div style={{ display: "flex", fontFamily: "Sora", fontSize: 88, fontWeight: 700, letterSpacing: -3 }}>Orbit Rating</div>
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#b2c0d6", marginTop: 26 }}>Rotaeno 레이팅·B40·대상곡·완성도 분석</div>
        {sub && <div style={{ display: "flex", fontSize: 28, color: "#7d8ba4", marginTop: 14 }}>{sub}</div>}
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts(text) },
  );
}
