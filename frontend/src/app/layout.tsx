import type { Metadata, Viewport } from "next";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

export const metadata: Metadata = {
  title: "Ludo Empire – Ultimate Realtime Multiplayer",
  description: "Play the most visually stunning multiplayer Ludo game online. Challenge friends or random players in realtime with smooth animations and premium UI.",
  keywords: ["ludo", "multiplayer", "online game", "board game", "realtime"],
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Ludo Empire" },
};

export const viewport: Viewport = {
  themeColor: "#120a21",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${rajdhani.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
