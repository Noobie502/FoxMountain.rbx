import { redirect } from "next/navigation";
import { currentSession } from "./auth";
import { getAccount } from "./store";

// Who is looking at a signed-in page. Sends signed-out visitors (and players
// whose account was closed) back to the home page.
export async function requireViewer() {
  const session = await currentSession();
  if (!session) redirect("/");
  if (session.role === "developer") return { role: "developer", username: session.username, account: null };
  const account = await getAccount(session.username);
  if (!account) redirect("/");
  return { role: "player", username: account.username, account };
}
