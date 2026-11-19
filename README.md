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

## Sharing a game or trip with friends

A Scrabble game or a trip can be shared without giving out the password. Open
it while signed in and use **Share with friends → Create share link**. Anyone
with the link (`/shared/<key>`) can view and edit that one game or trip — and
nothing else: guests can't list, create, or delete games, and can't reach Lift
or other trips.

- **Reset link** issues a new key; the old URL stops working immediately.
  **Stop sharing** removes the link entirely.
- Guest writes are rate-limited per link (120 changes per 10 minutes, in
  `app/lib/shareLinks.js`). The signed-in owner is never rate-limited.
- Keys are 128 random bits, stored in the `share_links` table.

If a shared game or trip gets wrecked, the previous data is kept and can be
restored by hand:

- `scrabble_game_revisions` — a snapshot of a game's state at most every 5
  minutes while it is being edited, kept for 30 days.
- `expense_history` — the full previous row of every edited or deleted expense.
