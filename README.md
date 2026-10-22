# M-Bank

The bank for our Minecraft server. Players open an account with their
Minecraft username and must lock it with a password (4–8 characters).
Built with Next.js and deployed on Vercel, with accounts stored in Redis
(Upstash) from the Vercel Marketplace.

> This repo previously held FoxMountain.rbx (a Roblox server bank). That
> version is still in the git history if you ever need it.

## What works today

- **Open an account** — Minecraft username (3–16 letters, numbers or `_`,
  one account per name, case-insensitive) and a mandatory password, 4–8
  characters, typed twice.
- **Sign in / sign out** — a signed, HTTP-only session cookie that lasts 7 days.
- **Account page** — player face, balance (in emeralds, starts at 0),
  account number (`MB-1234-5678`), date opened.
- **Brute-force protection** — 5 wrong passwords in a row locks the account
  for 10 minutes. Short passwords are easy to guess, so this matters.
- Passwords are hashed with scrypt; the plain password is never stored.

## How it's put together

| Path | What it does |
| --- | --- |
| `app/page.js`, `app/AuthPanel.js` | Home page with the Open account / Sign in forms |
| `app/account/` | The signed-in account page |
| `app/api/accounts/route.js` | `POST` — open an account |
| `app/api/session/route.js` | `POST` — sign in, `DELETE` — sign out |
| `lib/auth.js` | Validation rules, password hashing, session cookie |
| `lib/store.js` | Redis access (falls back to memory in local dev) |

Redis keys: `mbank:account:<username>` holds each account,
`mbank:usernames` is the set of all usernames.

## Deploying

1. Push to `main` on GitHub.
2. In Vercel: **Add New → Project → import this repo** (framework: Next.js).
3. In the project: **Storage → Create Database → Redis (Upstash)** and
   connect it to the project. The code reads `KV_REST_API_URL` /
   `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*` names) automatically.
4. Optional: add an env var `SESSION_SECRET` (any long random string) to
   sign session cookies. Without it the Redis token is used.
5. Optional: `MBANK_MAX_ACCOUNTS` (default 50) caps how many accounts can exist.
6. Redeploy.

## Local development

```bash
npm install
npm run dev
```

Without Redis credentials, local dev keeps accounts in memory (they vanish
on restart). To use the real database: `npx vercel link` then
`npx vercel env pull .env.local`.

## Not yet built

- Deposits, withdrawals and transfers between players
- Admin tools (resetting a forgotten password, adjusting balances)
