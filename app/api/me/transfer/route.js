import { NextResponse } from "next/server";
import { currentUsername, publicAccount } from "@/lib/auth";
import { addHistory, fail, handleError, readAmount, readJson } from "@/lib/api";
import { formatAmount, formatBalance, toDiamonds } from "@/lib/money";
import { findAccountByNumber, getAccount, saveAccount, withAccountLocks } from "@/lib/store";

const ACCOUNT_NUMBER_RE = /^MB-\d{4}-\d{4}$/i;

// Send emeralds or diamonds to another player.
// Body: { to: "<username or MB-1234-5678>", amount, unit }
export async function POST(req) {
  const me = await currentUsername();
  if (!me) return fail("Sign in to send money.", 401);

  const body = await readJson(req);
  if (!body) return fail("Send the transfer as JSON.");
  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to) return fail("Enter who you're sending to: their username or account number.");
  const { amount, unit, error } = readAmount(body);
  if (error) return fail(error);

  try {
    const recipient = ACCOUNT_NUMBER_RE.test(to) ? await findAccountByNumber(to) : await getAccount(to);
    if (!recipient) return fail(`There's no M-Bank account for "${to}". Check the username or account number.`, 404);
    if (recipient.username.toLowerCase() === me) return fail("You can't send money to your own account.");

    return await withAccountLocks([me, recipient.username], async () => {
      // Re-read both inside the lock so balances are current.
      const sender = await getAccount(me);
      const receiver = await getAccount(recipient.username);
      if (!sender) return fail("Your account no longer exists.", 404);
      if (!receiver) return fail(`${recipient.username}'s account was just closed.`, 404);

      const diamonds = toDiamonds(amount, unit);
      if (sender.balanceDiamonds < diamonds) {
        return fail(`You only have ${formatBalance(sender.balanceDiamonds)}, not enough to send ${formatAmount(amount, unit)}.`);
      }

      sender.balanceDiamonds -= diamonds;
      receiver.balanceDiamonds += diamonds;
      addHistory(sender, { type: "transfer-out", amount, unit, deltaDiamonds: -diamonds, counterparty: receiver.username });
      addHistory(receiver, { type: "transfer-in", amount, unit, deltaDiamonds: diamonds, counterparty: sender.username });
      await saveAccount(sender);
      await saveAccount(receiver);

      return NextResponse.json({ account: publicAccount(sender), to: receiver.username });
    });
  } catch (err) {
    return handleError(err, "The transfer didn't go through. Try again.");
  }
}
