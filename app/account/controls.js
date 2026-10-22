"use client";

import { useEffect, useRef, useState } from "react";
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
export function PlayerHead({ username, size = 56 }) {
  const [failed, setFailed] = useState(false);
  const img = useRef(null);
  // An image that failed before React hydrated never fires onError, so check once on mount.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) {
    return (
      <span className="head head-fallback" style={{ width: size, height: size, fontSize: size / 2 }} aria-hidden="true">
        {username[0].toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={img}
      className="head"
      src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/64`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}
