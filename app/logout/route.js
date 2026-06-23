import { NextResponse } from "next/server";
import { COOKIE_NAME } from "../lib/session";

/**
 * Clears the session cookie and returns to the login page. A plain GET so it
 * can be hit from a link or the address bar.
 * @param {Request} request - The incoming request.
 * @return {Response} The redirect response.
 */
export function GET(request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(COOKIE_NAME);
  return response;
}
