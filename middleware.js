import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "./app/lib/session";

/**
 * Gates the personal tools behind the shared password. Unauthenticated
 * navigations are bounced to /login with a `from` hint so we can return the
 * user where they were headed. Server-action POSTs to these routes are guarded
 * again inside the actions themselves (see requireAuth).
 * @param {Request} request - The incoming request.
 * @return {Promise<Response>} The response.
 */
export async function middleware(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (await verifyToken(token)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/misc/lift",
    "/misc/lift/:path*",
    "/misc/split-cost",
    "/misc/split-cost/:path*",
  ],
};
