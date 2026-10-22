import { NextResponse } from "next/server";
import { developerAccount, isDeveloper } from "@/lib/auth";
import { addHistory, fail, handleError, readAmount, readJson } from "@/lib/api";
import { formatAmount, toDiamonds } from "@/lib/money";
import { deleteAccount, getAccount, saveAccount, withAccountLocks } from "@/lib/store";

// Add or remove emeralds/diamonds on any account. Developer only.
// Body: { action: "add" | "remove", amount: number, unit: "emeralds" | "diamonds" }
export async function POST(req, { params }) {
  if (!(await isDeveloper())) return fail("Developer sign-in required.", 401);

  const body = await readJson(req);
  if (!body) return fail("Send the change as JSON.");
  const { action } = body;
  if (action !== "add" && action !== "remove") return fail("Choose Add or Remove.");
  const { amount, unit, error } = readAmount(body);
  if (error) return fail(error);

  try {
    const username = decodeURIComponent((await params).username);
    return await withAccountLocks([username], async () => {
      const account = await getAccount(username);
      if (!account) return fail("That account no longer exists.", 404);

      const delta = toDiamonds(amount, unit) * (action === "add" ? 1 : -1);
      if (account.balanceDiamonds + delta < 0) {
        return fail(`${account.username} doesn't have ${formatAmount(amount, unit)} to remove.`);
      }

      account.balanceDiamonds += delta;
      addHistory(account, { type: action === "add" ? "dev-add" : "dev-remove", amount, unit, deltaDiamonds: delta });
      await saveAccount(account);
      return NextResponse.json({ account: developerAccount(account) });
    });
  } catch (err) {
    return handleError(err, "Couldn't update the balance. Try again.");
  }
}

// Delete any account. Developer only.
export async function DELETE(_req, { params }) {
  if (!(await isDeveloper())) return fail("Developer sign-in required.", 401);
  try {
    const username = decodeURIComponent((await params).username);
    return await withAccountLocks([username], async () => {
      const account = await getAccount(username);
      if (!account) return fail("That account no longer exists.", 404);
      await deleteAccount(account.username);
      return NextResponse.json({ deleted: account.username });
    });
  } catch (err) {
    return handleError(err, "Couldn't delete the account. Try again.");
  }
}
