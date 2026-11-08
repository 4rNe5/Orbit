#!/usr/bin/env node
/**
 * Refreshes song metadata and jacket art from the Rotaeno Chinese wiki (wiki.rotaeno.cn).
 *
 *   node scripts/sync-wiki.mjs [--refresh-jackets] [--report <file.md>]
 *
 * Writes
 *   src/data/songinfo.json   artist, duration, version, designers, note counts (per song in charts.json)
 *   src/data/jackets.json    song IDs that have art
 *   public/jackets/<id>.webp 256px, public/jackets/sm/<id>.webp 128px (only missing ones unless --refresh-jackets)
 *
 * Chart constants are NOT touched: the rating sheet stays the source of truth for them.
 * Behind a proxy (local sandbox) run with NODE_USE_ENV_PROXY=1. Where the wiki is unreachable
 * (GitHub Actions), set WIKI_PROXY to the wiki-proxy Edge Function URL.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WIKI = "https://wiki.rotaeno.cn";
const UA = "OrbitRating/1.0 (+https://github.com/4rNe5/Orbit)";
/** Sheet song ID → wiki song ID where they differ. */
const ALIASES = { ture: "true" };
const DIFF = { 0: "I", 1: "II", 2: "III", 3: "IV", 200: "IV-α" };
const NOTE_KEY = { I: "I", II: "II", III: "III", IV: "IV", "IV-α": "IV_Alpha" };
const LANGS = ["ko", "en", "ja", "zh-Hant", "zh-Hans", "zh-CN"];

const args = process.argv.slice(2);
const refreshJackets = args.includes("--refresh-jackets");
const reportPath = args.includes("--report") ? args[args.indexOf("--report") + 1] : null;

const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Optional relay (supabase/functions/wiki-proxy) for hosts that can't reach the wiki directly,
 * e.g. GitHub Actions runners: WIKI_PROXY=https://<ref>.supabase.co/functions/v1/wiki-proxy
 */
const PROXY = process.env.WIKI_PROXY || "";
const via = (url) => (PROXY && url.startsWith(WIKI) ? `${PROXY}?path=${encodeURIComponent(url.slice(WIKI.length))}` : url);

async function get(url, as = "json") {
  let last;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(via(url), { headers: { "User-Agent": UA, ...(PROXY ? { "x-region": "ap-northeast-2" } : {}) } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return as === "json" ? await res.json() : as === "text" ? await res.text() : Buffer.from(await res.arrayBuffer());
    } catch (e) {
      last = e;
      await sleep(1500 * (i + 1));
    }
  }
  throw last;
}
const raw = (title) => get(`${WIKI}/index.php?title=${encodeURIComponent(title)}&action=raw`, "text").then(JSON.parse);
const api = (params) => get(`${WIKI}/api.php?${new URLSearchParams({ format: "json", ...params })}`);

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

// ── song info ────────────────────────────────────────────────────────────
const charts = read("src/data/charts.json");
const songIds = [...new Set(charts.map((c) => c.songId))];
const wikiId = (id) => ALIASES[id] ?? id;

console.log("fetching song list and note stats…");
const [songlist, noteStats] = await Promise.all([raw("Template:Songlist.json"), raw("User:RainToneH/Template:SongNoteStats.json")]);
const wikiSongs = new Map(songlist.songs.map((s) => [s.id, s]));
const notes = new Map(noteStats.songs.map((s) => [s.song_id, s.difficulties]));

const info = {};
const missingInfo = [];
for (const id of songIds) {
  const s = wikiSongs.get(wikiId(id));
  if (!s) {
    missingInfo.push(id);
    continue;
  }
  const tl = s.title_localized;
  const alt = [];
  for (const l of LANGS) {
    const v = (tl[l] ?? "").trim();
    if (v && v !== tl.default && !alt.some((a) => a[1] === v)) alt.push([l, v]);
  }
  const ns = notes.get(s.id) ?? {};
  const c = {};
  for (const d of s.difficulties) {
    const name = DIFF[d.ratingClass];
    if (!name) continue;
    const st = ns[NOTE_KEY[name]];
    c[name] = { cd: d.chartDesigner, ...(st ? { n: [st.total, st.tap, st.flick, st.slide, st.catch, st.rotate] } : {}) };
  }
  const e = { w: tl.default, a: s.artist, d: s.duration, v: s.release_version, jd: s.difficulties[0]?.jacketDesigner ?? "", c };
  if (alt.length) e.t = alt;
  const src = s.source_localized?.default;
  if (src) e.s = src;
  info[id] = e;
}
const prevInfo = existsSync(join(ROOT, "src/data/songinfo.json")) ? read("src/data/songinfo.json") : {};
const added = Object.keys(info).filter((k) => !prevInfo[k]);
const changed = Object.keys(info).filter((k) => prevInfo[k] && JSON.stringify(prevInfo[k]) !== JSON.stringify(info[k]));
writeFileSync(join(ROOT, "src/data/songinfo.json"), JSON.stringify(info));

// ── jackets ──────────────────────────────────────────────────────────────
const have = new Set(read("src/data/jackets.json"));
mkdirSync(join(ROOT, "public/jackets/sm"), { recursive: true });
const todo = songIds.filter((id) => refreshJackets || !have.has(id) || !existsSync(join(ROOT, `public/jackets/${id}.webp`)));
const newJackets = [];
const missingArt = [];
for (let i = 0; i < todo.length; i += 20) {
  const chunk = todo.slice(i, i + 20);
  const d = await api({ action: "query", prop: "imageinfo", iiprop: "url", iiurlwidth: "384", titles: chunk.map((id) => `File:Songs_${wikiId(id)}.png`).join("|") });
  const byTitle = new Map(Object.values(d.query.pages).map((p) => [p.title.replace(/^File:/, "").replace(/ /g, "_"), p.imageinfo?.[0]]));
  await pool(chunk, 6, async (id) => {
    const ii = byTitle.get(`Songs_${wikiId(id)}.png`);
    if (!ii) return missingArt.push(id);
    const buf = await get(ii.thumburl ?? ii.url, "buffer");
    const img = sharp(buf).flatten({ background: "#000" });
    await img.clone().resize(256, 256).webp({ quality: 85 }).toFile(join(ROOT, `public/jackets/${id}.webp`));
    await img.clone().resize(128, 128).webp({ quality: 80 }).toFile(join(ROOT, `public/jackets/sm/${id}.webp`));
    have.add(id);
    newJackets.push(id);
  });
}
// every jacket needs its small variant
for (const id of have) {
  const sm = join(ROOT, `public/jackets/sm/${id}.webp`);
  if (!existsSync(sm)) await sharp(join(ROOT, `public/jackets/${id}.webp`)).resize(128, 128).webp({ quality: 80 }).toFile(sm);
}
writeFileSync(join(ROOT, "src/data/jackets.json"), JSON.stringify([...have].filter((id) => songIds.includes(id)).sort()));

// ── packs without a Korean name in src/lib/packs.ts ──────────────────────
const packsTs = readFileSync(join(ROOT, "src/lib/packs.ts"), "utf8");
const known = new Set([...packsTs.matchAll(/\["([^"]+)", "/g)].map((m) => m[1]));
const wikiPacks = new Map(songlist.packs.map((p) => [p.id, p]));
const unknownPacks = new Map();
for (const c of charts) {
  for (const p of [c.pack, c.songPack]) {
    if (known.has(p) || unknownPacks.has(p)) continue;
    const ws = wikiSongs.get(wikiId(c.songId));
    const wp = ws && wikiPacks.get(ws.pack_id);
    unknownPacks.set(p, wp ? `${wp.name.ko ?? wp.name.en ?? "?"} (${wp.category})` : "?");
  }
}

// ── report ───────────────────────────────────────────────────────────────
const lines = [
  "## 위키 데이터 동기화",
  "",
  `- 곡 정보: ${Object.keys(info).length}/${songIds.length}곡 (새로 ${added.length}, 변경 ${changed.length})`,
  `- 자켓: ${have.size}/${songIds.length}곡 (새로 받음 ${newJackets.length})`,
  added.length ? `- 새 곡 정보: ${added.join(", ")}` : null,
  changed.length ? `- 바뀐 곡 정보: ${changed.join(", ")}` : null,
  newJackets.length ? `- 새 자켓: ${newJackets.join(", ")}` : null,
  missingInfo.length ? `- ⚠ 위키에 곡 정보 없음: ${missingInfo.join(", ")}` : null,
  missingArt.length ? `- ⚠ 위키에 자켓 없음: ${missingArt.join(", ")}` : null,
  unknownPacks.size ? `- ⚠ src/lib/packs.ts에 한국어 이름이 없는 팩: ${[...unknownPacks].map(([k, v]) => `${k} → ${v}`).join(", ")}` : null,
  "",
  "정수는 바꾸지 않습니다. 정수는 관리자 페이지에서 분석표로 갱신합니다.",
].filter((l) => l !== null);
console.log(lines.join("\n"));
if (reportPath) writeFileSync(reportPath, lines.join("\n") + "\n");
