import { Redis } from "@upstash/redis";
import { DIAMONDS_PER_EMERALD } from "./money";

// Accounts live in Redis (Upstash, added from the Vercel Marketplace).
//   mbank:account:<username, lowercased>  ->  account JSON
//   mbank:usernames                        ->  set of lowercased usernames
//   mbank:dev-login                        ->  failed developer sign-ins
const ACCOUNT_PREFIX = "mbank:account:";
const USERNAMES_KEY = "mbank:usernames";
const DEV_LOGIN_KEY = "mbank:dev-login";

export const STORAGE_NOT_CONFIGURED =
  "M-Bank's storage isn't set up yet. Add a Redis (Upstash) database to this Vercel project from the Marketplace, then redeploy.";

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(STORAGE_NOT_CONFIGURED);
  }
}

// Vercel's Upstash integration has used two env var naming schemes; accept either.
function redisFromEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// During local development without Redis, fall back to an in-memory store so
// the site still works. Never used in production.
function memoryStore() {
  const g = globalThis;
  if (!g.__mbankMemory) g.__mbankMemory = { kv: new Map(), sets: new Map() };
  const { kv, sets } = g.__mbankMemory;
  return {
    async get(key) {
      return kv.has(key) ? structuredClone(kv.get(key)) : null;
    },
    async mget(...keys) {
      return keys.map((k) => (kv.has(k) ? structuredClone(kv.get(k)) : null));
    },
    async set(key, value, opts) {
      if (opts?.nx && kv.has(key)) return null;
      kv.set(key, structuredClone(value));
      if (opts?.ex) {
        setTimeout(() => {
          if (kv.get(key) === value) kv.delete(key);
        }, opts.ex * 1000).unref?.();
      }
      return "OK";
    },
    async del(...keys) {
      let n = 0;
      for (const k of keys) if (kv.delete(k)) n++;
      return n;
    },
    async srem(key, member) {
      return sets.get(key)?.delete(member) ? 1 : 0;
    },
    async sadd(key, member) {
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key).add(member);
      return 1;
    },
    async smembers(key) {
      return [...(sets.get(key) ?? [])];
    },
    async scard(key) {
      return sets.get(key)?.size ?? 0;
    },
  };
}

let client;
function db() {
  if (client) return client;
  const redis = redisFromEnv();
  if (redis) return (client = redis);
  if (process.env.NODE_ENV !== "production") return (client = memoryStore());
  throw new StorageNotConfiguredError();
}

const keyFor = (username) => ACCOUNT_PREFIX + username.toLowerCase();

// Older records stored `balance` in emeralds; everything now counts diamonds.
function normalize(account) {
  if (!account) return null;
  if (typeof account.balanceDiamonds !== "number") {
    account.balanceDiamonds = (Number(account.balance) || 0) * DIAMONDS_PER_EMERALD;
  }
  delete account.balance;
  if (!Array.isArray(account.history)) account.history = [];
  return account;
}

export async function getAccount(username) {
  return normalize(await db().get(keyFor(username)));
}

export async function listAccounts() {
  const names = await db().smembers(USERNAMES_KEY);
  if (!names.length) return [];
  const rows = await db().mget(...names.map((n) => ACCOUNT_PREFIX + n));
  return rows
    .filter(Boolean)
    .map(normalize)
    .sort((a, b) => a.username.localeCompare(b.username, "en", { sensitivity: "base" }));
}

// Returns false if the username is already taken.
export async function createAccount(account) {
  const created = await db().set(keyFor(account.username), account, { nx: true });
  if (created !== "OK") return false;
  await db().sadd(USERNAMES_KEY, account.username.toLowerCase());
  return true;
}

export async function saveAccount(account) {
  await db().set(keyFor(account.username), account);
}

export async function deleteAccount(username) {
  await db().del(keyFor(username));
  await db().srem(USERNAMES_KEY, username.toLowerCase());
}

export async function findAccountByNumber(accountNumber) {
  const wanted = accountNumber.trim().toUpperCase();
  return (await listAccounts()).find((a) => a.accountNumber === wanted) ?? null;
}

// Short-lived locks so two money moves on the same account can't interleave
// (e.g. sending the same emeralds twice from two tabs at once).
const LOCK_PREFIX = "mbank:lock:";

export class AccountBusyError extends Error {
  constructor() {
    super("Another change to this account is in progress. Try again in a moment.");
  }
}

export async function withAccountLocks(usernames, fn) {
  const keys = [...new Set(usernames.map((u) => LOCK_PREFIX + u.toLowerCase()))].sort();
  const token = `${Date.now()}-${Math.random()}`;
  const held = [];
  try {
    for (const key of keys) {
      let ok = false;
      for (let attempt = 0; attempt < 10 && !ok; attempt++) {
        ok = (await db().set(key, token, { nx: true, ex: 10 })) === "OK";
        if (!ok) await new Promise((r) => setTimeout(r, 100));
      }
      if (!ok) throw new AccountBusyError();
      held.push(key);
    }
    return await fn();
  } finally {
    if (held.length) await db().del(...held);
  }
}

export async function countAccounts() {
  return db().scard(USERNAMES_KEY);
}

export async function getDevLoginState() {
  return (await db().get(DEV_LOGIN_KEY)) ?? { failedAttempts: 0, lockedUntil: null };
}

export async function saveDevLoginState(state) {
  await db().set(DEV_LOGIN_KEY, state);
}
