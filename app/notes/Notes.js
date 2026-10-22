"use client";

import { useEffect, useState } from "react";

const when = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

export default function Notes({ initial, canEdit }) {
  const [saved, setSaved] = useState(initial); // what's in the database
  const [text, setText] = useState(initial.text);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [conflict, setConflict] = useState(null);
  const dirty = canEdit && text !== saved.text;

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(force = false) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, baseUpdatedAt: saved.updatedAt, force }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setConflict(data.latest);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Couldn't save the notes.");
      setSaved(data);
      setConflict(null);
      setMessage({ kind: "ok", text: "Notes saved. Everyone sees this version now." });
    } catch (err) {
      setMessage({ kind: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="notes">
      <header className="market-head">
        <div>
          <p className="eyebrow">Notes</p>
          <h1 className="page-title">Server notes</h1>
        </div>
        <p className="muted notes-updated">{saved.updatedAt ? `Last updated ${when(saved.updatedAt)}` : "Not written yet"}</p>
      </header>

      {canEdit ? (
        <section className="notes-editor">
          <label htmlFor="notes-text" className="sr-only">
            Notes
          </label>
          <textarea
            id="notes-text"
            className="notes-box"
            value={text}
            spellCheck
            placeholder="Type anything here: rules, announcements, coordinates, prices. Everyone signed in can read it; only you can edit it."
            onChange={(e) => {
              setText(e.target.value);
              setMessage(null);
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (dirty && !busy) save();
              }
            }}
          />
          {conflict && (
            <div className="notice notice-warn conflict" role="alert">
              <p>
                These notes were saved from somewhere else ({when(conflict.updatedAt)}) after you opened this page. Saving now will replace
                that version.
              </p>
              <div className="adjust-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setSaved(conflict);
                    setText(conflict.text);
                    setConflict(null);
                  }}
                >
                  Load their version
                </button>
                <button type="button" className="danger danger-solid" onClick={() => save(true)} disabled={busy}>
                  Replace with mine
                </button>
              </div>
            </div>
          )}
          <div className="notes-bar">
            <span className="muted">
              {text.length.toLocaleString("en-US")} characters
              {dirty ? " · Unsaved changes" : ""}
            </span>
            {message && (
              <span className={message.kind === "ok" ? "notes-ok" : "notes-error"} role={message.kind === "ok" ? "status" : "alert"}>
                {message.text}
              </span>
            )}
            <span className="notes-actions">
              {dirty && (
                <button type="button" className="ghost" onClick={() => setText(saved.text)} disabled={busy}>
                  Discard changes
                </button>
              )}
              <button type="button" className="primary" onClick={() => save()} disabled={!dirty || busy}>
                {busy ? "Saving…" : "Save notes"}
              </button>
            </span>
          </div>
        </section>
      ) : saved.text.trim() ? (
        <article className="notes-read">{saved.text}</article>
      ) : (
        <section className="market-empty">
          <p>The developer hasn't written any notes yet.</p>
        </section>
      )}
    </main>
  );
}
