import { redirect } from "next/navigation";
import { currentUsername, publicAccount } from "@/lib/auth";
import { getAccount, StorageNotConfiguredError } from "@/lib/store";
import Emerald from "../Emerald";
import { Activity, BalanceFigure } from "../Balance";
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
          <BalanceFigure totalDiamonds={account.balanceDiamonds} />
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

        <section className="activity-section">
          <h2>Recent activity</h2>
          <Activity history={account.history} emptyText="No changes yet. Emeralds and diamonds the developer adds will show up here." />
        </section>
      </main>
    </div>
  );
}
