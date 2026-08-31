# FoxMountain.rbx

A player-run banking system for a Roblox server — bank accounts, jobs with
real-time shifts, a car marketplace, and a house marketplace — built with
Next.js and deployed on Vercel.

This started as a single-file Claude Artifact. It's now a normal Next.js
app so it can live on GitHub and deploy through Vercel like any other
project. The one thing that changed under the hood: shared state (accounts,
jobs, car and house listings) used to live inside the page itself; now it
lives in a small key-value store (Redis, via the Upstash integration on
Vercel's Marketplace) behind one API route, and the page polls that API
every few seconds so every visitor sees the same data.

## How it's put together

- `app/page.js` — renders an empty `<div id="app">` and loads `public/app.js`.
- `public/app.js` — the whole client app: builds every screen as HTML
  strings and re-renders on any state change (no framework, no build step
  for this file — it's served as a static asset).
- `app/api/state/route.js` — `GET` returns the shared state, `POST` merges
  a patch (e.g. `{ "accounts": [...] }`) into it and returns the result.
  Backed by `@upstash/redis`.
- `app/globals.css` — all the site's styling.

## Deploying

1. **Push this repo to GitHub** (you're likely doing that right now).
2. **Import it in Vercel** (or it may already be linked, if Claude set that
   up for you) — vercel.com → Add New → Project → select this repo.
3. **Add shared storage.** In the new project's dashboard: Storage → Create
   Database → pick **Redis** (powered by Upstash) → connect it to this
   project. That's it — no code changes needed, the API route reads the
   connection details from whichever environment variables Vercel sets
   automatically for that integration.
4. **Redeploy** (Vercel will usually do this automatically once the
   database is connected; if not, trigger a redeploy from the Deployments
   tab). Once it's live, opening the site should show an empty bank/job/car
   list instead of a storage warning banner.

## Local development

```bash
npm install
npm run dev
```

To develop against the real shared database instead of a blank local one,
link this folder to the Vercel project and pull its environment variables:

```bash
npx vercel link
npx vercel env pull .env.local
```

Without that, the app still runs locally, but every save will show a
"shared storage isn't configured yet" message, because there's no KV
database to write to.

## Known limitations

- **No accounts/auth.** Anyone who opens the site can select and act as any
  bank account — this mirrors how the original Claude Artifact version
  worked (a shared community tool, not a secured multi-tenant system).
- **Last-write-wins.** Two people saving at the exact same instant can have
  one save overwrite the other; there's no locking. Fine for a small
  community game server, worth knowing about at larger scale.
- **Polling, not push.** Other players' changes show up within ~4 seconds,
  not instantly. Good enough for this use case; swapping in something like
  Vercel's real-time features or a WebSocket would remove the delay if it
  ever matters.
