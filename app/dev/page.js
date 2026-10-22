import { redirect } from "next/navigation";
import { developerAccount, isDeveloper } from "@/lib/auth";
import { listAccounts, StorageNotConfiguredError } from "@/lib/store";
import AppShell from "../AppShell";
import DevDashboard from "./DevDashboard";

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
    <AppShell role="developer" active="bank">
      {storageError ? <p className="error page-error">{storageError}</p> : <DevDashboard initialAccounts={accounts} />}
    </AppShell>
  );
}
