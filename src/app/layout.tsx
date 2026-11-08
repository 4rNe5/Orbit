import type { Metadata, Viewport } from "next";
import { SongDialogProvider } from "@/components/song-dialog";
import { IBM_Plex_Sans_KR, Sora } from "next/font/google";
import { AppProvider } from "@/components/app-provider";
import { Shell } from "@/components/shell";
import "./globals.css";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const plex = IBM_Plex_Sans_KR({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600", "700"], preload: false });

export const metadata: Metadata = {
  title: { default: "Orbit Rating", template: "%s | Orbit Rating" },
  description: "Rotaeno 레이팅·B40·대상곡·완성도 분석",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f1f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0910" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${sora.variable} ${plex.variable} antialiased`} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("orbit:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        <AppProvider>
          <SongDialogProvider>
            <Shell>{children}</Shell>
          </SongDialogProvider>
        </AppProvider>
      </body>
    </html>
  );
}
