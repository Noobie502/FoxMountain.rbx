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
- **Account page** — player face, balance in emeralds and diamonds
  (1 emerald = 10 diamonds, starts at 0), account number (`MB-1234-5678`),
  date opened, and recent activity.
- **Send to a player** — players send emeralds or diamonds to another
  account by username or account number.
- **Withdraw** — players can take emeralds or diamonds out of their own account.
- **Close account** — players can delete their own account (password required).
- **Developer dashboard** (`/dev`) — "Sign in as developer" on the home
  page. Lists every account, shows each player's password, and lets the
  developer add or remove emeralds or diamonds on any account, or delete an
  account (type the username to confirm). Only the developer can add money;
  players can only move or withdraw what they have.
- **Sidebar** on every signed-in page: Housing market, then My account
  (players) or Developer dashboard (developer). Becomes a tab bar on phones.
- **Housing market** (`/market`) — the developer lists properties with a
  required picture, bedrooms, bathrooms, square feet, address and price
  (emeralds or diamonds), and can remove listings. Players browse and **buy**:
  the price leaves their account, the house is marked sold to them and shows
  as "Yours". Two players can't buy the same house.
- **No double-spending** — every money move takes a short lock on the
  accounts involved, so simultaneous requests can't spend the same emeralds twice.
- **Brute-force protection** — 5 wrong passwords in a row locks the account
  for 10 minutes. Short passwords are easy to guess, so this matters.
- Passwords are hashed with scrypt for sign-in. A second copy is encrypted
  (AES-256-GCM, keyed from the server secret) so the developer dashboard can
  show it. The sign-up form tells players the developer can see passwords.
- Balances are stored as whole diamonds (`balanceDiamonds`).

## How it's put together

| Path | What it does |
| --- | --- |
| `app/page.js`, `app/AuthPanel.js` | Home page with the Open account / Sign in forms |
| `app/account/` | The signed-in account page |
| `app/dev/` | Developer dashboard |
| `app/api/dev/session/route.js` | `POST` — developer sign-in, `DELETE` — sign out |
| `app/api/dev/accounts/route.js` | `GET` — every account with passwords (developer only) |
| `app/api/dev/accounts/[username]/route.js` | `POST` — add/remove emeralds or diamonds (developer only) |
| `app/api/me/route.js` | `DELETE` — close your own account (password required) |
| `app/api/me/transfer/route.js` | `POST` — send to another player |
| `app/api/me/withdraw/route.js` | `POST` — withdraw from your own account |
| `app/AppShell.js` | Top bar + sidebar used by every signed-in page |
| `app/market/` | Housing market page, listing form, buy flow |
| `app/api/houses/route.js` | `GET` — listings (signed in), `POST` — new listing (developer) |
| `app/api/houses/[id]/route.js` | `DELETE` — remove a listing (developer) |
| `app/api/houses/[id]/buy/route.js` | `POST` — buy a property (players) |
| `app/api/houses/[id]/image/route.js` | `GET` — a listing's picture |
| `lib/houses.js` | Listing validation |
| `lib/money.js` | Emerald/diamond conversion and formatting |
| `app/api/accounts/route.js` | `POST` — open an account |
| `app/api/session/route.js` | `POST` — sign in, `DELETE` — sign out |
| `lib/auth.js` | Validation rules, password hashing, session cookie |
| `lib/store.js` | Redis access (falls back to memory in local dev) |

Redis keys: `mbank:account:<username>` holds each account,
`mbank:usernames` is the set of all usernames, `mbank:house:<id>` and
`mbank:houses` hold listings, and `mbank:house-image:<id>` holds each
listing's picture (resized in the browser to under ~600 KB).

## Deploying

1. Push to `main` on GitHub.
2. In Vercel: **Add New → Project → import this repo** (framework: Next.js).
3. In the project: **Storage → Create Database → Redis (Upstash)** and
   connect it to the project. The code reads `KV_REST_API_URL` /
   `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*` names) automatically.
4. Optional: add an env var `SESSION_SECRET` (any long random string) to
   sign session cookies. Without it the Redis token is used.
5. Optional: `MBANK_MAX_ACCOUNTS` (default 50) caps how many accounts can exist.
6. Optional: `DEV_USERNAME` / `DEV_PASSWORD` change the developer login.
   Without them the defaults built into `lib/auth.js` apply (the password is
   stored only as a scrypt hash, since this repo is public).
7. Redeploy.

> Don't change `SESSION_SECRET` (or swap the Redis database token) once
> players have accounts: the developer view of existing passwords is
> encrypted with it and would stop being readable.

## Local development

```bash
npm install
npm run dev
```

Without Redis credentials, local dev keeps accounts in memory (they vanish
on restart). To use the real database: `npx vercel link` then
`npx vercel env pull .env.local`.

## Not yet built

- Resetting a forgotten password from the developer dashboard
