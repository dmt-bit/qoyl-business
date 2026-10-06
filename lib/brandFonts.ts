import { Space_Grotesk, Space_Mono } from "next/font/google";

// Shared by the self-serve pages that use the stark black-on-white look
// (/apply, /login, the brand pending-payment page). Each layout imports these
// and applies the class names, so the CSS variables are defined once.
export const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-grotesk",
});
export const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono-apply",
});
