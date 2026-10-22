import { NextResponse } from "next/server";
import {
  checkDevCredentials,
  clearSessionCookie,
  devUsername,
  LOCK_MINUTES,
  MAX_FAILED_ATTEMPTS,
  setDevSessionCookie,
} from "@/lib/auth";
import { getDevLoginState, saveDevLoginState, StorageNotConfiguredError } from "@/lib/store";

// Developer sign-in.
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
    return NextResponse.json({ error: "Enter the developer username and password." }, { status: 400 });
  }

  try {
    const state = await getDevLoginState();
    if (state.lockedUntil && Date.parse(state.lockedUntil) > Date.now()) {
      const mins = Math.ceil((Date.parse(state.lockedUntil) - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Too many wrong attempts. Developer sign-in is locked for ${mins} more minute${mins === 1 ? "" : "s"}.` },
        { status: 423 }
      );
    }

    if (!(await checkDevCredentials(username, password))) {
      state.failedAttempts = (state.failedAttempts || 0) + 1;
      if (state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        state.failedAttempts = 0;
        state.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
      }
      await saveDevLoginState(state);
      return NextResponse.json({ error: "Those aren't the developer credentials." }, { status: 401 });
    }

    if (state.failedAttempts || state.lockedUntil) await saveDevLoginState({ failedAttempts: 0, lockedUntil: null });
    await setDevSessionCookie(devUsername());
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong signing in. Try again." }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
