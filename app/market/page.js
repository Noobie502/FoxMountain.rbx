import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { publicHouse } from "@/lib/houses";
import { getAccount, listHouses, StorageNotConfiguredError } from "@/lib/store";
import AppShell from "../AppShell";
import Market from "./Market";

export const dynamic = "force-dynamic";
export const metadata = { title: "Housing market · M-Bank" };

export default async function MarketPage() {
  const session = await currentSession();
  if (!session) redirect("/");
  const isDev = session.role === "developer";

  let houses = [];
  let viewer = { role: session.role, username: null, balanceDiamonds: null };
  let storageError = null;
  try {
    if (!isDev) {
      const account = await getAccount(session.username);
      if (!account) redirect("/");
      viewer = { role: "player", username: account.username, balanceDiamonds: account.balanceDiamonds };
    }
    houses = (await listHouses()).map(publicHouse);
  } catch (err) {
    if (!(err instanceof StorageNotConfiguredError)) throw err;
    storageError = err.message;
  }

  return (
    <AppShell role={session.role} active="market">
      {storageError ? <p className="error page-error">{storageError}</p> : <Market initialHouses={houses} canList={isDev} viewer={viewer} />}
    </AppShell>
  );
}
