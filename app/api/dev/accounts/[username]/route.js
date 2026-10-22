import { NextResponse } from "next/server";
import { developerAccount, isDeveloper } from "@/lib/auth";
import { formatAmount, toDiamonds } from "@/lib/money";
import { getAccount, saveAccount, StorageNotConfiguredError } from "@/lib/store";

const MAX_AMOUNT = 1_000_000;

// Add or remove emeralds/diamonds. Developer only — players can never change balances.
// Body: { action: "add" | "remove", amount: number, unit: "emeralds" | "diamonds" }
export async function POST(req, { params }) {
  if (!(await isDeveloper())) {
    return NextResponse.json({ error: "Developer sign-in required." }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the change as JSON." }, { status: 400 });
  }
  const { action, unit } = body ?? {};
  const amount = Number(body?.amount);
  if (action !== "add" && action !== "remove") {
    return NextResponse.json({ error: "Choose Add or Remove." }, { status: 400 });
  }
  if (unit !== "emeralds" && unit !== "diamonds") {
    return NextResponse.json({ error: "Choose emeralds or diamonds." }, { status: 400 });
  }
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
    return NextResponse.json({ error: `Enter a whole number from 1 to ${MAX_AMOUNT.toLocaleString("en-US")}.` }, { status: 400 });
  }

  try {
    const { username } = await params;
    const account = await getAccount(decodeURIComponent(username));
    if (!account) return NextResponse.json({ error: "That account no longer exists." }, { status: 404 });

    const delta = toDiamonds(amount, unit) * (action === "add" ? 1 : -1);
    if (account.balanceDiamonds + delta < 0) {
      return NextResponse.json(
        { error: `${account.username} doesn't have ${formatAmount(amount, unit)} to remove.` },
        { status: 400 }
      );
    }

    account.balanceDiamonds += delta;
    account.history = [
      { at: new Date().toISOString(), action, amount, unit, deltaDiamonds: delta, by: "developer" },
      ...account.history,
    ].slice(0, 50);
    await saveAccount(account);

    return NextResponse.json({ account: developerAccount(account) });
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(err);
    return NextResponse.json({ error: "Couldn't update the balance. Try again." }, { status: 500 });
  }
}
