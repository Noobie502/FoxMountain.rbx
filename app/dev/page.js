import { redirect } from "next/navigation";
import { developerAccount, devUsername, isDeveloper } from "@/lib/auth";
import { listAccounts, StorageNotConfiguredError } from "@/lib/store";
import Emerald from "../Emerald";
import DevDashboard, { DevSignOut } from "./DevDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Developer · M-Bank" };

export default async function DevPage() {
  if (!(await isDeveloper())) redirect("/");

  let accounts = [];
  let storageError = null;
  try {
    accounts = (await listAccounts()).map(developerAccount);
  } catch (err) {
    if (!(err instanceof StorageNotConfiguredError)) throw err;
    storageError = err.message;
  }

  return (
    <div className="shell shell-wide">
      <header className="topbar">
        <span className="wordmark">
          <Emerald size={22} />
          M-Bank
          <span className="dev-badge">Developer</span>
        </span>
        <span className="topbar-right">
          <span className="signed-in-as">Signed in as {devUsername()}</span>
          <DevSignOut />
        </span>
      </header>
      {storageError ? <p className="error page-error">{storageError}</p> : <DevDashboard initialAccounts={accounts} />}
    </div>
  );
}
