import { type NextRequest, NextResponse } from "next/server";

// Redirect www.business.qoyl.live → business.qoyl.live (or equivalent www →
// non-www for any host). Vercel needs both the www and non-www domain added to
// the project — this handles the redirect once the DNS resolves.
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("www.")) {
    const nonWww = host.slice(4);
    const url = request.nextUrl.clone();
    url.host = nonWww;
    return NextResponse.redirect(url, { status: 301 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
