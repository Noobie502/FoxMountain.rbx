"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/session", { method: "DELETE" }).catch(() => {});
        router.push("/");
        router.refresh();
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable; the number is selectable text */
        }
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// The player's Minecraft face, with their initial as a fallback.
export function PlayerHead({ username }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="head head-fallback" aria-hidden="true">
        {username[0].toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="head"
      src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/64`}
      width={56}
      height={56}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
