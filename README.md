# 👋🏼 Hi

This is the personal website for Adam Bechtold.

## Auth for the personal tools

The tools under `/misc/lift` and `/misc/split-cost` are gated behind a single
shared password. Everything else on the site stays public. Auth is a stateless,
signed session cookie — no database table, no third-party provider.

Two environment variables are required (set them in the Vercel project settings,
and in a local `.env.local` for development):

| Variable       | What it is                                                         |
| -------------- | ------------------------------------------------------------------ |
| `APP_PASSWORD` | The password you type on the sign-in page.                         |
| `AUTH_SECRET`  | A long random string used to sign session cookies. Keep it secret. |

Generate a strong `AUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Notes:

- Rotating `AUTH_SECRET` invalidates every existing session (forces re-login).
- Changing `APP_PASSWORD` only affects new sign-ins; existing sessions stay valid
  until they expire (90 days) or you rotate `AUTH_SECRET`.
- Sign out by visiting `/logout`.
