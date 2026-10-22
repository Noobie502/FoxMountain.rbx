"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatAmount, formatBalance, toDiamonds } from "@/lib/money";

async function send(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

function AmountPicker({ idPrefix, amount, setAmount, unit, setUnit }) {
  return (
    <div className="adjust-row">
      <label htmlFor={`${idPrefix}-amount`} className="sr-only">
        Amount
      </label>
      <input
        id={`${idPrefix}-amount`}
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
      />
      <div className="unit-toggle" role="radiogroup" aria-label="Currency">
        {["emeralds", "diamonds"].map((u) => (
          <button key={u} type="button" role="radio" aria-checked={unit === u} className="unit" onClick={() => setUnit(u)}>
            {u === "emeralds" ? "Emeralds" : "Diamonds"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MoneyActions({ balanceDiamonds }) {
  const router = useRouter();
  const [mode, setMode] = useState("send"); // "send" | "withdraw"
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("emeralds");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const parsed = Number(amount);
  const valid = Number.isInteger(parsed) && parsed > 0;
  const diamonds = valid ? toDiamonds(parsed, unit) : 0;
  const tooMuch = valid && diamonds > balanceDiamonds;

  function switchMode(m) {
    setMode(m);
    setMessage(null);
  }

  async function submit(e) {
    e.preventDefault();
    setMessage(null);
    if (mode === "send" && !to.trim()) return setMessage({ kind: "error", text: "Enter who you're sending to." });
    if (!valid) return setMessage({ kind: "error", text: "Enter a whole number greater than 0." });
    if (tooMuch) return setMessage({ kind: "error", text: `You only have ${formatBalance(balanceDiamonds)}.` });
    setBusy(true);
    try {
      if (mode === "send") {
        const data = await send("/api/me/transfer", "POST", { to: to.trim(), amount: parsed, unit });
        setMessage({ kind: "ok", text: `Sent ${formatAmount(parsed, unit)} to ${data.to}.` });
        setTo("");
      } else {
        await send("/api/me/withdraw", "POST", { amount: parsed, unit });
        setMessage({ kind: "ok", text: `Withdrew ${formatAmount(parsed, unit)}.` });
      }
      setAmount("");
      router.refresh();
    } catch (err) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="money" aria-labelledby="money-title">
      <h2 id="money-title" className="sr-only">
        Move money
      </h2>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" className="tab" aria-selected={mode === "send"} onClick={() => switchMode("send")}>
          Send to a player
        </button>
        <button type="button" role="tab" className="tab" aria-selected={mode === "withdraw"} onClick={() => switchMode("withdraw")}>
          Withdraw
        </button>
      </div>
      <form className="form" onSubmit={submit} noValidate>
        {mode === "send" ? (
          <div className="field">
            <label htmlFor="send-to">Send to</label>
            <input
              id="send-to"
              value={to}
              spellCheck={false}
              autoComplete="off"
              placeholder="Username or MB-1234-5678"
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        ) : (
          <p className="hint">Take emeralds or diamonds out of your account. They're removed from your balance.</p>
        )}
        <div className="field">
          <span className="label-like">Amount</span>
          <AmountPicker idPrefix={mode} amount={amount} setAmount={setAmount} unit={unit} setUnit={setUnit} />
          {valid && (
            <p className={`hint ${tooMuch ? "hint-error" : ""}`}>
              {unit === "emeralds" && `${formatAmount(parsed, "emeralds")} = ${diamonds.toLocaleString("en-US")} diamonds. `}
              {tooMuch ? `That's more than your ${formatBalance(balanceDiamonds)}.` : `You'll have ${formatBalance(balanceDiamonds - diamonds)} left.`}
            </p>
          )}
        </div>
        {message && (
          <p className={message.kind === "ok" ? "success" : "error"} role={message.kind === "ok" ? "status" : "alert"}>
            {message.text}
          </p>
        )}
        <button className="primary" type="submit" disabled={busy || tooMuch}>
          {busy ? (mode === "send" ? "Sending…" : "Withdrawing…") : mode === "send" ? "Send" : "Withdraw"}
        </button>
      </form>
    </section>
  );
}

export function CloseAccount({ username, balanceDiamonds }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm(e) {
    e.preventDefault();
    setError("");
    if (!password) return setError("Enter your password to confirm.");
    setBusy(true);
    try {
      await send("/api/me", "DELETE", { password });
      router.push("/?closed=1");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="danger-zone" aria-labelledby="close-title">
      <h2 id="close-title">Close account</h2>
      {!open ? (
        <>
          <p className="muted">Permanently deletes {username}'s account and its history. This can't be undone.</p>
          <button type="button" className="danger danger-inline" onClick={() => setOpen(true)}>
            Close my account
          </button>
        </>
      ) : (
        <form className="confirm-box" onSubmit={confirm} noValidate>
          {balanceDiamonds > 0 && (
            <p className="notice notice-warn">
              You still have {formatBalance(balanceDiamonds)}. Closing the account deletes it. Send it to another player first if
              you want to keep it.
            </p>
          )}
          <div className="field">
            <label htmlFor="close-password">Enter your password to confirm</label>
            <input
              id="close-password"
              type="password"
              maxLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="adjust-actions">
            <button type="button" className="ghost" onClick={() => { setOpen(false); setPassword(""); setError(""); }}>
              Keep my account
            </button>
            <button type="submit" className="danger danger-solid" disabled={busy}>
              {busy ? "Closing…" : "Close account permanently"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
