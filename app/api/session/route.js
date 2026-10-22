import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  LOCK_MINUTES,
  MAX_FAILED_ATTEMPTS,
  publicAccount,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { getAccount, saveAccount, StorageNotConfiguredError } from "@/lib/store";

const WRONG = "That username and password don't match an M-Bank account.";

// Sign in.
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the username and password as JSON." }, { status: 400 });
  }
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
  }

  try {
    const account = await getAccount(username);
    if (!account) return NextResponse.json({ error: WRONG }, { status: 401 });

    if (account.lockedUntil && Date.parse(account.lockedUntil) > Date.now()) {
      const mins = Math.ceil((Date.parse(account.lockedUntil) - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Too many wrong passwords. This account is locked for ${mins} more minute${mins === 1 ? "" : "s"}.` },
        { status: 423 }
      );
    }

    if (!(await verifyPassword(password, account.passwordHash))) {
      account.failedAttempts = (account.failedAttempts || 0) + 1;
      if (account.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        account.failedAttempts = 0;
        account.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
      }
      await saveAccount(account);
      return NextResponse.json({ error: WRONG }, { status: 401 });
    }

    if (account.failedAttempts || account.lockedUntil) {
      account.failedAttempts = 0;
      account.lockedUntil = null;
      await saveAccount(account);
    }

    await setSessionCookie(account.username);
    return NextResponse.json({ account: publicAccount(account) });
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong signing in. Try again." }, { status: 500 });
  }
}

// Sign out.
export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
