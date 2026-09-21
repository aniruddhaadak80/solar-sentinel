import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const SITE = "https://solar-sentinel-vert.vercel.app";

export const metadata: Metadata = {
  title: "Solar Sentinel — Live Space-Weather Intelligence",
  description:
    "Live NOAA + NASA space-weather feeds, a deterministic geomagnetic-risk engine, hash-chained audit seals and MCP agent tools on a 3D planet.",
  keywords: ["space weather", "geomagnetic storm", "Kp index", "solar wind", "MCP", "AI agents", "NOAA", "NASA DONKI", "next.js", "3D globe"],
  authors: [{ name: "aniruddhaadak80" }],
  openGraph: {
    title: "Solar Sentinel — Live Space-Weather Intelligence",
    description: "Watch solar storms hit Earth live: risk engine, 3D globe, MCP tools, verifiable seals.",
    url: SITE,
    siteName: "Solar Sentinel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Solar Sentinel — Live Space-Weather Intelligence",
    description: "Live Kp, solar wind, flares + deterministic risk engine + MCP tools on a 3D globe.",
  },
  metadataBase: new URL(SITE),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#04060c]">{children}</body>
    </html>
  );
}
