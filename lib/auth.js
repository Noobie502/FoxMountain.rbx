import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = "mbank_session";
const SESSION_DAYS = 7;
const DEV_SESSION_HOURS = 12;

// Minecraft Java usernames: 3–16 letters, digits or underscores.
export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 8;

// After this many wrong passwords in a row the account is locked briefly,
// which matters because 8-character passwords are easy to guess by brute force.
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 10;

// --- Developer login -------------------------------------------------------
// The repo is public, so the developer password is never written here in
// plain text. Set DEV_USERNAME / DEV_PASSWORD in Vercel to override these.
const DEFAULT_DEV_USERNAME = "Noobie511";
const DEFAULT_DEV_PASSWORD_HASH =
  "scrypt:67765640c03bede6e5f0e4c56011374f:ce0218ee36427fa8ca433541287e386f602112295a4b0e06bb3397eff0e8fd5e";

export const devUsername = () => process.env.DEV_USERNAME || DEFAULT_DEV_USERNAME;

export async function checkDevCredentials(username, password) {
  const nameOk = username.toLowerCase() === devUsername().toLowerCase();
  const passOk = process.env.DEV_PASSWORD
    ? safeEqual(password, process.env.DEV_PASSWORD)
    : await verifyPassword(password, DEFAULT_DEV_PASSWORD_HASH);
  return nameOk && passOk;
}

export function validateUsername(username) {
  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return "Use your Minecraft username: 3–16 letters, numbers or underscores.";
  }
  if (username.toLowerCase() === devUsername().toLowerCase()) {
    return "That name is reserved for the M-Bank developer.";
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

// --- Passwords -------------------------------------------------------------

function safeEqual(a, b) {
  const x = createHash("sha256").update(String(a)).digest();
  const y = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(x, y);
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

// A second, reversible copy of each player password so the developer
// dashboard can show it. Encrypted with AES-256-GCM using the server secret.
const encKey = () => createHash("sha256").update(`mbank-password-view:${secret()}`).digest();

export function encryptPassword(password) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const data = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return `gcm:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}

export function decryptPassword(stored) {
  try {
    const [scheme, iv, tag, data] = String(stored).split(":");
    if (scheme !== "gcm") return null;
    const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function newAccountNumber() {
  const digits = Array.from({ length: 8 }, () => randomInt(10)).join("");
  return `MB-${digits.slice(0, 4)}-${digits.slice(4)}`;
}

// --- Sessions: a signed cookie holding who is signed in and until when. ---
// Player sessions:     "p:<username>.<expires>.<sig>"
// Developer sessions:  "d:<username>.<expires>.<sig>"

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

function createSessionValue(role, username, hours) {
  const expires = Date.now() + hours * 60 * 60 * 1000;
  const payload = `${role}:${username.toLowerCase()}.${expires}`;
  return { value: `${payload}.${sign(payload)}`, expires: new Date(expires) };
}

function readSessionValue(value) {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [who, expires, signature] = parts;
  const expected = Buffer.from(sign(`${who}.${expires}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(expires) < Date.now()) return null;
  const [role, username] = who.split(":");
  if (!username || (role !== "p" && role !== "d")) return null;
  return { role: role === "d" ? "developer" : "player", username };
}

async function writeCookie({ value, expires }) {
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export const setSessionCookie = (username) => writeCookie(createSessionValue("p", username, SESSION_DAYS * 24));
export const setDevSessionCookie = (username) => writeCookie(createSessionValue("d", username, DEV_SESSION_HOURS));

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentSession() {
  return readSessionValue((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function currentUsername() {
  const s = await currentSession();
  return s?.role === "player" ? s.username : null;
}

export async function isDeveloper() {
  const s = await currentSession();
  return s?.role === "developer" && s.username === devUsername().toLowerCase();
}

// --- What the browser is allowed to see -----------------------------------

export function publicAccount(account) {
  return {
    username: account.username,
    accountNumber: account.accountNumber,
    balanceDiamonds: account.balanceDiamonds,
    createdAt: account.createdAt,
    history: account.history.slice(0, 20),
  };
}

export function developerAccount(account) {
  return {
    ...publicAccount(account),
    password: account.passwordEncrypted ? decryptPassword(account.passwordEncrypted) : null,
    locked: Boolean(account.lockedUntil && Date.parse(account.lockedUntil) > Date.now()),
  };
}
