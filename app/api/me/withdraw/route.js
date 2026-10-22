import { NextResponse } from "next/server";
import { currentUsername, publicAccount } from "@/lib/auth";
import { addHistory, fail, handleError, readAmount, readJson } from "@/lib/api";
import { formatAmount, formatBalance, toDiamonds } from "@/lib/money";
import { getAccount, saveAccount, withAccountLocks } from "@/lib/store";

// Take emeralds or diamonds out of your own account.
// Body: { amount, unit }
export async function POST(req) {
  const me = await currentUsername();
  if (!me) return fail("Sign in to withdraw.", 401);

  const body = await readJson(req);
  if (!body) return fail("Send the withdrawal as JSON.");
  const { amount, unit, error } = readAmount(body);
  if (error) return fail(error);

  try {
    return await withAccountLocks([me], async () => {
      const account = await getAccount(me);
      if (!account) return fail("Your account no longer exists.", 404);

      const diamonds = toDiamonds(amount, unit);
      if (account.balanceDiamonds < diamonds) {
        return fail(`You only have ${formatBalance(account.balanceDiamonds)}, not enough to withdraw ${formatAmount(amount, unit)}.`);
      }

      account.balanceDiamonds -= diamonds;
      addHistory(account, { type: "withdraw", amount, unit, deltaDiamonds: -diamonds });
      await saveAccount(account);
      return NextResponse.json({ account: publicAccount(account) });
    });
  } catch (err) {
    return handleError(err, "The withdrawal didn't go through. Try again.");
  }
}
