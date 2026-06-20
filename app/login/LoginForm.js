"use client";

import React, { useState } from "react";
import PropTypes from "prop-types";
import { useRouter } from "next/navigation";
import { login } from "./actions";
import styles from "./login.module.css";

/**
 * Password form for the gated personal tools. On success the server action
 * sets the session cookie and we navigate (client-side) to the destination.
 * @param {{destination: string}} props - Where to go after signing in.
 * @return {React.ReactElement} The rendered form.
 */
export default function LoginForm({ destination }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  /**
   * @param {React.FormEvent} e - The submit event.
   */
  async function onSubmit(e) {
    e.preventDefault();
    setPending(true);
    setError("");
    const res = await login(password);
    if (res?.error) {
      setError(res.error);
      setPending(false);
      return;
    }
    router.replace(destination);
    router.refresh();
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={onSubmit}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.sub}>Enter the password to continue.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          aria-label="Password"
        />
        {error && <div className={styles.error}>{error}</div>}
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

LoginForm.propTypes = {
  destination: PropTypes.string.isRequired,
};
