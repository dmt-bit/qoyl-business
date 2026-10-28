import { grotesk, mono } from "@/lib/brandFonts";

// Standalone pitch page: no nav, no footer -- this page has one job. Same
// black/white/bronze system as /apply and /login.
export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${grotesk.variable} ${mono.variable} min-h-screen bg-white text-[#0a0a0a]`}
      style={{ fontFamily: "var(--font-grotesk), sans-serif" }}
    >
      {children}
    </div>
  );
}
