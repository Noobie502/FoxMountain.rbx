"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatAmount, formatBalance, toDiamonds } from "@/lib/money";
import { Activity, BalanceFigure } from "../Balance";
import { CopyButton, PlayerHead } from "../account/controls";

export function DevSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/dev/session", { method: "DELETE" }).catch(() => {});
        router.push("/");
        router.refresh();
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

export default function DevDashboard({ initialAccounts }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [selected, setSelected] = useState(initialAccounts[0]?.username ?? null);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const total = accounts.reduce((sum, a) => sum + a.balanceDiamonds, 0);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? accounts.filter((a) => a.username.toLowerCase().includes(q) || a.accountNumber.toLowerCase().includes(q)) : accounts;
  }, [accounts, query]);
  const current = accounts.find((a) => a.username === selected) ?? null;

  async function refresh() {
    setRefreshing(true);
    setLoadError("");
    try {
      const res = await fetch("/api/dev/accounts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load accounts.");
      setAccounts(data.accounts);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  function replaceAccount(updated) {
    setAccounts((list) => list.map((a) => (a.username === updated.username ? updated : a)));
  }

  return (
    <main className="dev">
      <section className="dev-summary" aria-label="Bank totals">
        <div>
          <p className="eyebrow">Accounts</p>
          <p className="summary-figure">{accounts.length}</p>
        </div>
        <div>
          <p className="eyebrow">In the bank</p>
          <p className="summary-figure">{formatBalance(total)}</p>
        </div>
        <button type="button" className="ghost" onClick={refresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </section>
      {loadError && <p className="error">{loadError}</p>}

      {accounts.length === 0 ? (
        <section className="dev-empty">
          <h2>No accounts yet</h2>
          <p>When players open accounts from the home page, they'll appear here.</p>
        </section>
      ) : (
        <div className="dev-grid">
          <section className="dev-list" aria-label="All accounts">
            <label htmlFor="dev-search" className="sr-only">
              Search accounts
            </label>
            <input
              id="dev-search"
              className="search"
              placeholder="Search by player or account number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="account-rows">
              {shown.map((a) => (
                <li key={a.username}>
                  <button
                    type="button"
                    className="account-row"
                    aria-current={a.username === selected ? "true" : undefined}
                    onClick={() => {
                      setSelected(a.username);
                      if (window.matchMedia("(max-width: 900px)").matches) {
                        requestAnimationFrame(() => document.getElementById("account-detail")?.scrollIntoView({ block: "start" }));
                      }
                    }}
                  >
                    <PlayerHead username={a.username} size={32} />
                    <span className="row-main">
                      <span className="row-name">
                        {a.username}
                        {a.locked && <span className="pill pill-warn">Locked</span>}
                      </span>
                      <span className="row-number mono">{a.accountNumber}</span>
                    </span>
                    <span className="row-balance">{formatBalance(a.balanceDiamonds)}</span>
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="activity-empty">No account matches “{query}”.</li>}
            </ul>
          </section>

          {current && <AccountDetail key={current.username} account={current} onUpdated={replaceAccount} />}
        </div>
      )}
    </main>
  );
}

function AccountDetail({ account, onUpdated }) {
  const [showPassword, setShowPassword] = useState(false);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("emeralds");
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null); // { kind: "ok" | "error", text }

  const parsed = Number(amount);
  const valid = Number.isInteger(parsed) && parsed > 0;
  const delta = valid ? toDiamonds(parsed, unit) : 0;
  const canRemove = valid && account.balanceDiamonds - delta >= 0;

  async function change(action) {
    setMessage(null);
    if (!valid) return setMessage({ kind: "error", text: "Enter a whole number greater than 0." });
    setBusy(action);
    try {
      const res = await fetch(`/api/dev/accounts/${encodeURIComponent(account.username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, amount: parsed, unit }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't update the balance.");
      onUpdated(data.account);
      setMessage({
        kind: "ok",
        text: `${action === "add" ? "Added" : "Removed"} ${formatAmount(parsed, unit)} ${action === "add" ? "to" : "from"} ${account.username}.`,
      });
      setAmount("");
    } catch (err) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="account-detail" className="dev-detail" aria-label={`${account.username}'s account`}>
      <div className="holder">
        <PlayerHead username={account.username} />
        <div>
          <p className="eyebrow">Account holder</p>
          <h2 className="holder-name">{account.username}</h2>
        </div>
      </div>

      <dl className="details details-dev">
        <div>
          <dt>Account number</dt>
          <dd>
            <span className="mono">{account.accountNumber}</span>
          </dd>
        </div>
        <div>
          <dt>Password</dt>
          <dd>
            {account.password === null ? (
              <span className="muted">Not viewable (opened before passwords were visible)</span>
            ) : (
              <>
                <span className="mono password-value">{showPassword ? account.password : "•".repeat(account.password.length)}</span>
                <button type="button" className="copy" onClick={() => setShowPassword((s) => !s)} aria-pressed={showPassword}>
                  {showPassword ? "Hide" : "Show"}
                </button>
                {showPassword && <CopyButton text={account.password} />}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Opened</dt>
          <dd>{new Date(account.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</dd>
        </div>
      </dl>
      {account.locked && <p className="notice">This account is locked for a few minutes after too many wrong passwords.</p>}

      <div className="dev-balance">
        <p className="eyebrow">Balance</p>
        <BalanceFigure totalDiamonds={account.balanceDiamonds} size="medium" />
      </div>

      <form className="adjust" onSubmit={(e) => { e.preventDefault(); change("add"); }}>
        <p className="adjust-title">Change balance</p>
        <div className="adjust-row">
          <label htmlFor="adjust-amount" className="sr-only">
            Amount
          </label>
          <input
            id="adjust-amount"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
          />
          <div className="unit-toggle" role="radiogroup" aria-label="Currency">
            {["emeralds", "diamonds"].map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={unit === u}
                className="unit"
                onClick={() => setUnit(u)}
              >
                {u === "emeralds" ? "Emeralds" : "Diamonds"}
              </button>
            ))}
          </div>
        </div>
        {valid && (
          <p className="hint">
            {unit === "emeralds" && `${formatAmount(parsed, "emeralds")} = ${delta.toLocaleString("en-US")} diamonds. `}
            After adding: {formatBalance(account.balanceDiamonds + delta)}.
            {canRemove ? ` After removing: ${formatBalance(account.balanceDiamonds - delta)}.` : " Too much to remove."}
          </p>
        )}
        <div className="adjust-actions">
          <button type="submit" className="primary" disabled={busy !== null}>
            {busy === "add" ? "Adding…" : "Add"}
          </button>
          <button type="button" className="danger" disabled={busy !== null || (valid && !canRemove)} onClick={() => change("remove")}>
            {busy === "remove" ? "Removing…" : "Remove"}
          </button>
        </div>
        {message && (
          <p className={message.kind === "ok" ? "success" : "error"} role={message.kind === "ok" ? "status" : "alert"}>
            {message.text}
          </p>
        )}
      </form>

      <div>
        <p className="adjust-title">Activity</p>
        <Activity history={account.history} emptyText="No balance changes yet." />
      </div>
    </section>
  );
}
