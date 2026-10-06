import { grotesk, mono } from "@/lib/brandFonts";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${grotesk.variable} ${mono.variable} min-h-screen bg-white text-[#0a0a0a]`}
      style={{ fontFamily: "var(--font-grotesk), sans-serif" }}
    >
      {children}
    </div>
  );
}
