import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orbit Rating",
    short_name: "Orbit",
    description: "Rotaeno 레이팅·B40·대상곡·완성도 분석",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#060a14",
    theme_color: "#060a14",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "점수 입력", url: "/scores" },
      { name: "B40", url: "/best" },
      { name: "대상곡", url: "/targets" },
    ],
  };
}
