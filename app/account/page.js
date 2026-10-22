import { redirect } from "next/navigation";
import { currentUsername, publicAccount } from "@/lib/auth";
import { getAccount, listHouses, StorageNotConfiguredError } from "@/lib/store";
import { formatBalance } from "@/lib/money";
import Link from "next/link";
import AppShell from "../AppShell";
import { Activity, BalanceFigure } from "../Balance";
import { CopyButton, PlayerHead } from "./controls";
import { CloseAccount, MoneyActions } from "./MoneyActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account · M-Bank" };

export default async function AccountPage({ searchParams }) {
  const username = await currentUsername();
  if (!username) redirect("/");

  let stored;
  let owned = [];
  try {
    stored = await getAccount(username);
    owned = (await listHouses()).filter((h) => h.status === "sold" && h.owner?.toLowerCase() === username);
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
    <AppShell role="player" active="bank">
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

        <MoneyActions balanceDiamonds={account.balanceDiamonds} />

        <section className="activity-section">
          <h2>Your properties</h2>
          {owned.length === 0 ? (
            <p className="activity-empty">
              You don't own any property yet. Browse the <Link href="/market">housing market</Link>.
            </p>
          ) : (
            <ul className="owned">
              {owned.map((h) => (
                <li key={h.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/houses/${h.id}/image`} alt="" />
                  <span className="owned-main">
                    <strong>{h.address}</strong>
                    <span className="muted">
                      {h.bedrooms} bed · {h.bathrooms} bath · {h.squareFeet.toLocaleString("en-US")} sq ft
                    </span>
                  </span>
                  <span className="owned-price">{formatBalance(h.priceDiamonds)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="activity-section">
          <h2>Recent activity</h2>
          <Activity history={account.history} emptyText="No activity yet. Money you send, receive or withdraw shows up here." />
        </section>

        <CloseAccount username={account.username} balanceDiamonds={account.balanceDiamonds} />
      </main>
    </AppShell>
  );
}
