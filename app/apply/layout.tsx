import { Space_Grotesk, Space_Mono } from "next/font/google";

// The apply forms use the same stark black-on-white look as the marketing
// pages (Space Grotesk + Space Mono, lowercase, hairline borders) rather
// than the dark bronze portal theme -- they're the first thing a prospect
// sees after clicking through from those pages.
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono-apply" });

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${grotesk.variable} ${mono.variable} min-h-screen bg-white text-[#0a0a0a]`}
      style={{ fontFamily: "var(--font-grotesk), sans-serif" }}
    >
      {children}
    </div>
  );
}
