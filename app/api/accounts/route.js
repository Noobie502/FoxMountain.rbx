import { NextResponse } from "next/server";
import {
  encryptPassword,
  hashPassword,
  newAccountNumber,
  publicAccount,
  setSessionCookie,
  validatePassword,
  validateUsername,
} from "@/lib/auth";
import { countAccounts, createAccount, StorageNotConfiguredError } from "@/lib/store";

// A small server needs few accounts; this cap stops anyone filling the store.
const MAX_ACCOUNTS = Number(process.env.MBANK_MAX_ACCOUNTS) || 50;

// Open a new account: Minecraft username + a mandatory password (4–8 chars).
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the username and password as JSON." }, { status: 400 });
  }

  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = body?.password;
  const problem = validateUsername(username) || validatePassword(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    if ((await countAccounts()) >= MAX_ACCOUNTS) {
      return NextResponse.json(
        { error: `M-Bank is full (${MAX_ACCOUNTS} accounts). Ask a server admin to raise the limit.` },
        { status: 403 }
      );
    }

    const account = {
      username,
      accountNumber: newAccountNumber(),
      passwordHash: await hashPassword(password),
      passwordEncrypted: encryptPassword(password),
      balanceDiamonds: 0,
      history: [],
      createdAt: new Date().toISOString(),
      failedAttempts: 0,
      lockedUntil: null,
    };

    if (!(await createAccount(account))) {
      return NextResponse.json(
        { error: `${username} already has an M-Bank account. Sign in instead.` },
        { status: 409 }
      );
    }

    await setSessionCookie(username);
    return NextResponse.json({ account: publicAccount(account) }, { status: 201 });
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong opening the account. Try again." }, { status: 500 });
  }
}
