import { createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = "mbank_session";
const SESSION_DAYS = 7;

// Minecraft Java usernames: 3–16 letters, digits or underscores.
export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 8;

// After this many wrong passwords in a row the account is locked briefly,
// which matters because 8-character passwords are easy to guess by brute force.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 10;

export function validateUsername(username) {
  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return "Use your Minecraft username: 3–16 letters, numbers or underscores.";
  }
  return null;
}

export function validatePassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    return "Every M-Bank account must be locked with a password.";
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `Passwords must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`;
  }
  return null;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 32)).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = await scryptAsync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function newAccountNumber() {
  const digits = Array.from({ length: 8 }, () => randomInt(10)).join("");
  return `MB-${digits.slice(0, 4)}-${digits.slice(4)}`;
}

// --- Sessions: a signed cookie holding the username and an expiry time. ---

function secret() {
  const s =
    process.env.SESSION_SECRET ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;
  if (s) return s;
  if (process.env.NODE_ENV !== "production") return "mbank-local-dev-secret";
  throw new Error("Set SESSION_SECRET (or connect the Redis integration) before deploying.");
}

const sign = (payload) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSessionValue(username) {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${username.toLowerCase()}.${expires}`;
  return { value: `${payload}.${sign(payload)}`, expires: new Date(expires) };
}

export function readSessionValue(value) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [username, expires, signature] = parts;
  const expected = Buffer.from(sign(`${username}.${expires}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(expires) < Date.now()) return null;
  return username;
}

export async function setSessionCookie(username) {
  const { value, expires } = createSessionValue(username);
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentUsername() {
  return readSessionValue((await cookies()).get(SESSION_COOKIE)?.value);
}

// The account as the browser is allowed to see it (never the password hash).
export function publicAccount(account) {
  return {
    username: account.username,
    accountNumber: account.accountNumber,
    balance: account.balance,
    createdAt: account.createdAt,
  };
}
