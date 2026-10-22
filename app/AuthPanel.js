"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PASSWORD_MAX = 8;
const PASSWORD_MIN = 4;
const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;

export default function AuthPanel() {
  const [mode, setMode] = useState("open"); // "open" | "signin"

  return (
    <section className="panel" aria-label="Your M-Bank account">
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          id="tab-open"
          aria-selected={mode === "open"}
          aria-controls="panel-form"
          className="tab"
          onClick={() => setMode("open")}
        >
          Open an account
        </button>
        <button
          type="button"
          role="tab"
          id="tab-signin"
          aria-selected={mode === "signin"}
          aria-controls="panel-form"
          className="tab"
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
      </div>
      <div id="panel-form" role="tabpanel" aria-labelledby={mode === "open" ? "tab-open" : "tab-signin"}>
        {mode === "open" ? <OpenAccountForm key="open" /> : <SignInForm key="signin" />}
      </div>
    </section>
  );
}

function PasswordField({ id, label, value, onChange, hint, autoComplete }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="field">
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        <span className={`count ${value.length === PASSWORD_MAX ? "count-full" : ""}`} aria-live="polite">
          {value.length}/{PASSWORD_MAX}
        </span>
      </div>
      <div className="password-wrap">
        <input
          id={id}
          name={id}
          type={shown ? "text" : "password"}
          value={value}
          maxLength={PASSWORD_MAX}
          autoComplete={autoComplete}
          required
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" className="reveal" onClick={() => setShown((s) => !s)} aria-pressed={shown}>
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

function OpenAccountForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    const name = username.trim();
    if (!USERNAME_RE.test(name)) return setError("Use your Minecraft username: 3–16 letters, numbers or underscores.");
    if (password.length < PASSWORD_MIN) return setError(`Your password needs at least ${PASSWORD_MIN} characters.`);
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await post("/api/accounts", { username: name, password });
      router.push("/account?welcome=1");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="open-username">Minecraft username</label>
        <input
          id="open-username"
          name="open-username"
          value={username}
          maxLength={16}
          autoComplete="username"
          spellCheck={false}
          placeholder="Steve_42"
          required
          onChange={(e) => setUsername(e.target.value)}
        />
        <p className="hint">Use the exact name you play with, so people can find you.</p>
      </div>
      <PasswordField
        id="open-password"
        label="Lock it with a password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        hint={`${PASSWORD_MIN}–${PASSWORD_MAX} characters. Required for every account.`}
      />
      <PasswordField
        id="open-confirm"
        label="Type the password again"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />
      <p className="notice">There's no password reset. Write it down somewhere safe.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" type="submit" disabled={busy}>
        {busy ? "Opening account…" : "Open my account"}
      </button>
    </form>
  );
}

function SignInForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) return setError("Enter your username and password.");
    setBusy(true);
    try {
      await post("/api/session", { username: username.trim(), password });
      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="signin-username">Minecraft username</label>
        <input
          id="signin-username"
          name="signin-username"
          value={username}
          maxLength={16}
          autoComplete="username"
          spellCheck={false}
          required
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <PasswordField
        id="signin-password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
