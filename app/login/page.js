import React from "react";
import { redirect } from "next/navigation";
import { isAuthenticated } from "../lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * Only allow same-site, single-slash paths as a post-login destination so the
 * `from` param can't be used as an open redirect.
 * @param {string|undefined} from - The requested destination.
 * @return {string} A safe internal path.
 */
function safeDestination(from) {
  if (
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//")
  ) {
    return from;
  }
  return "/misc/lift";
}

/**
 * Login page for the password-gated personal tools.
 * @param {Object} props - Route props.
 * @param {Promise<Object>} props.searchParams - The route's query params.
 * @return {Promise<React.ReactElement>} The rendered page.
 */
export default async function LoginPage({ searchParams }) {
  const { from } = await searchParams;
  const destination = safeDestination(from);
  if (await isAuthenticated()) redirect(destination);
  return <LoginForm destination={destination} />;
}
