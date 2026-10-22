import { Redis } from "@upstash/redis";

// Accounts live in Redis (Upstash, added from the Vercel Marketplace).
// One key per account, plus a set of all usernames:
//   mbank:account:<username, lowercased>  ->  account JSON
//   mbank:usernames                        ->  set of lowercased usernames
const ACCOUNT_PREFIX = "mbank:account:";
const USERNAMES_KEY = "mbank:usernames";

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
    async set(key, value, opts) {
      if (opts?.nx && kv.has(key)) return null;
      kv.set(key, structuredClone(value));
      return "OK";
    },
    async sadd(key, member) {
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key).add(member);
      return 1;
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

export async function getAccount(username) {
  return (await db().get(keyFor(username))) ?? null;
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

export async function countAccounts() {
  return db().scard(USERNAMES_KEY);
}
