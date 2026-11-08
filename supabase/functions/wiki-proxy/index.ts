// Read-only relay to wiki.rotaeno.cn for scripts/sync-wiki.mjs.
// GitHub Actions runners can't open TLS to the wiki's host; this function (invoked
// with `x-region: ap-northeast-2`) can. Only the few public paths the sync needs are allowed.
//
//   GET /functions/v1/wiki-proxy?path=<path on wiki.rotaeno.cn>

const WIKI = "https://wiki.rotaeno.cn";
const ALLOWED: RegExp[] = [
  /^\/index\.php\?title=(Template:Songlist\.json|User:RainToneH\/Template:SongNoteStats\.json)&action=raw$/,
  /^\/api\.php\?[^#]*$/,
  /^\/images\/(thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/Songs_[A-Za-z0-9._%-]+\.png(\/\d{2,4}px-Songs_[A-Za-z0-9._%-]+\.png)?$/,
];

function allowedApi(path: string) {
  if (!path.startsWith("/api.php?")) return true;
  const q = new URLSearchParams(path.slice("/api.php?".length));
  // read-only image lookups only
  return q.get("action") === "query" && !q.has("token") && [...q.keys()].every((k) => ["action", "format", "prop", "iiprop", "iiurlwidth", "titles", "list", "aiprefix", "ailimit", "aicontinue", "aiprop", "generator", "gaiprefix", "gailimit", "gaicontinue", "continue"].includes(k));
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("method not allowed", { status: 405 });
  const path = new URL(req.url).searchParams.get("path") ?? "";
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    /* keep raw */
  }
  if (!ALLOWED.some((r) => r.test(path) || r.test(decoded)) || !allowedApi(path)) return new Response("path not allowed", { status: 403 });

  let last = "";
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(WIKI + path, { headers: { "User-Agent": "OrbitRating/1.0 (+https://github.com/4rNe5/Orbit)" } });
      if (!res.ok) return new Response(`upstream ${res.status}`, { status: 502 });
      return new Response(res.body, {
        headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream", "Cache-Control": "public, max-age=600" },
      });
    } catch (e) {
      last = String(e);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return new Response(`upstream unreachable: ${last}`, { status: 504 });
});
