import { NextResponse } from "next/server";
import { clearSessionCookie, currentUsername, verifyPassword } from "@/lib/auth";
import { fail, handleError, readJson } from "@/lib/api";
import { deleteAccount, getAccount, withAccountLocks } from "@/lib/store";

// Close your own account. Requires your password as confirmation.
// Body: { password }
export async function DELETE(req) {
  const me = await currentUsername();
  if (!me) return fail("Sign in to close your account.", 401);

  const body = await readJson(req);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) return fail("Enter your password to confirm.");

  try {
    return await withAccountLocks([me], async () => {
      const account = await getAccount(me);
      if (!account) {
        await clearSessionCookie();
        return fail("Your account no longer exists.", 404);
      }
      if (!(await verifyPassword(password, account.passwordHash))) {
        return fail("That password is wrong, so your account wasn't closed.", 401);
      }
      await deleteAccount(account.username);
      await clearSessionCookie();
      return NextResponse.json({ deleted: account.username });
    });
  } catch (err) {
    return handleError(err, "Couldn't close the account. Try again.");
  }
}
