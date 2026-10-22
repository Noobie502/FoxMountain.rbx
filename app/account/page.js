import { redirect } from "next/navigation";
import { currentUsername, publicAccount } from "@/lib/auth";
import { getAccount, StorageNotConfiguredError } from "@/lib/store";
import Emerald from "../Emerald";
import { CopyButton, PlayerHead, SignOutButton } from "./controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account · M-Bank" };

export default async function AccountPage({ searchParams }) {
  const username = await currentUsername();
  if (!username) redirect("/");

  let stored;
  try {
    stored = await getAccount(username);
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return <p className="shell error">{err.message}</p>;
    }
    throw err;
  }
  if (!stored) redirect("/");

  const account = publicAccount(stored);
  const welcome = (await searchParams)?.welcome === "1";
  const opened = new Date(account.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">
          <Emerald size={22} />
          M-Bank
        </span>
        <SignOutButton />
      </header>

      <main className="account">
        {welcome && (
          <p className="welcome" role="status">
            Your account is open and locked with your password. Welcome to M-Bank.
          </p>
        )}

        <div className="holder">
          <PlayerHead username={account.username} />
          <div>
            <p className="eyebrow">Account holder</p>
            <h1 className="holder-name">{account.username}</h1>
          </div>
        </div>

        <section className="balance-card" aria-labelledby="balance-label">
          <p id="balance-label" className="eyebrow">
            Balance
          </p>
          <p className="balance">
            <Emerald size={36} />
            <span className="balance-figure">{account.balance.toLocaleString("en-US")}</span>
            <span className="balance-unit">emeralds</span>
          </p>
          <dl className="details">
            <div>
              <dt>Account number</dt>
              <dd>
                <span className="mono">{account.accountNumber}</span>
                <CopyButton text={account.accountNumber} />
              </dd>
            </div>
            <div>
              <dt>Opened</dt>
              <dd>{opened}</dd>
            </div>
            <div>
              <dt>Security</dt>
              <dd>
                <span className="pill">Password locked</span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="soon">
          <h2>Coming next</h2>
          <p>Deposits, withdrawals and transfers between players will show up here.</p>
        </section>
      </main>
    </div>
  );
}
