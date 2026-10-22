"use client";

import { useState } from "react";
import { formatBalance, toDiamonds } from "@/lib/money";
import { Gem } from "../Emerald";

const PERIODS = [
  ["shift", "per shift"],
  ["hour", "per hour"],
  ["day", "per day"],
  ["week", "per week"],
  ["once", "one-off"],
];
const periodLabel = Object.fromEntries(PERIODS);

export default function Jobs({ initialJobs, canPost }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");

  return (
    <main className="jobs">
      <header className="market-head">
        <div>
          <p className="eyebrow">Jobs</p>
          <h1 className="page-title">
            {jobs.length === 0 ? "No jobs posted" : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} open`}
          </h1>
        </div>
        {canPost && !formOpen && (
          <button type="button" className="primary" onClick={() => { setFormOpen(true); setNotice(""); }}>
            Post a job
          </button>
        )}
      </header>

      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}

      {canPost && formOpen && (
        <JobForm
          onCancel={() => setFormOpen(false)}
          onPosted={(job) => {
            setJobs((list) => [job, ...list]);
            setFormOpen(false);
            setNotice(`Posted “${job.title}”.`);
          }}
        />
      )}

      {jobs.length === 0 ? (
        <section className="market-empty">
          <p>
            {canPost
              ? "Use “Post a job” to add the first listing: a title, the pay, how often it pays, and a description."
              : "Jobs the developer posts will appear here."}
          </p>
        </section>
      ) : (
        <ul className="job-list">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              canRemove={canPost}
              onRemoved={() => {
                setJobs((list) => list.filter((j) => j.id !== job.id));
                setNotice(`Removed “${job.title}”.`);
              }}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function JobCard({ job, canRemove, onRemoved }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404) throw new Error(data.error || "Couldn't remove the job.");
      onRemoved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <li className="job">
      <div className="job-top">
        <div className="job-heading">
          <h2 className="job-title">{job.title}</h2>
          {job.location && <p className="job-location">{job.location}</p>}
        </div>
        <p className="job-pay">
          <Gem kind="emerald" size={18} />
          <span>
            <strong>{formatBalance(job.payDiamonds)}</strong> <span className="muted">{periodLabel[job.payPeriod]}</span>
          </span>
        </p>
      </div>
      <p className="job-description">{job.description}</p>
      <div className="job-foot">
        <time className="muted" dateTime={job.createdAt}>
          Posted {new Date(job.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </time>
        {canRemove &&
          (!confirming ? (
            <button type="button" className="text-danger" onClick={() => setConfirming(true)}>
              Remove job
            </button>
          ) : (
            <span className="house-confirm">
              <span>Remove this job?</span>
              <button type="button" className="ghost ghost-sm" onClick={() => setConfirming(false)} disabled={busy}>
                Keep
              </button>
              <button type="button" className="danger danger-solid danger-sm" onClick={remove} disabled={busy}>
                {busy ? "Removing…" : "Remove"}
              </button>
            </span>
          ))}
      </div>
      {error && <p className="error">{error}</p>}
    </li>
  );
}

function JobForm({ onCancel, onPosted }) {
  const [f, setF] = useState({ title: "", pay: "", payUnit: "emeralds", payPeriod: "shift", location: "", description: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setF((v) => ({ ...v, [key]: e.target.value }));
  const payOk = Number.isInteger(Number(f.pay)) && Number(f.pay) > 0;

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!f.title.trim()) return setError("Enter a job title.");
    if (!payOk) return setError("Enter the pay as a whole number greater than 0.");
    if (!f.description.trim()) return setError("Add a description.");
    setBusy(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, pay: Number(f.pay) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't post the job.");
      onPosted(data.job);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="listing-form" onSubmit={submit} noValidate>
      <h2 className="listing-title">Post a job</h2>
      <div className="job-form-grid">
        <div className="field">
          <label htmlFor="job-title">Job title</label>
          <input id="job-title" value={f.title} maxLength={80} onChange={set("title")} placeholder="Miner at the Northshore quarry" />
        </div>
        <div className="field">
          <label htmlFor="job-location">
            Location <span className="muted">(optional)</span>
          </label>
          <input id="job-location" value={f.location} maxLength={80} onChange={set("location")} placeholder="Northshore, x 420 z -1180" />
        </div>
        <div className="field job-pay-field">
          <span className="label-like">Pay</span>
          <div className="adjust-row">
            <label htmlFor="job-pay" className="sr-only">
              Pay amount
            </label>
            <input
              id="job-pay"
              inputMode="numeric"
              value={f.pay}
              placeholder="Amount"
              onChange={(e) => setF((v) => ({ ...v, pay: e.target.value.replace(/[^0-9]/g, "").slice(0, 7) }))}
            />
            <div className="unit-toggle" role="radiogroup" aria-label="Pay currency">
              {["emeralds", "diamonds"].map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={f.payUnit === u}
                  className="unit"
                  onClick={() => setF((v) => ({ ...v, payUnit: u }))}
                >
                  {u === "emeralds" ? "Emeralds" : "Diamonds"}
                </button>
              ))}
            </div>
            <label htmlFor="job-period" className="sr-only">
              How often it pays
            </label>
            <select id="job-period" className="select" value={f.payPeriod} onChange={set("payPeriod")}>
              {PERIODS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {payOk && (
            <p className="hint">
              Pays {formatBalance(toDiamonds(Number(f.pay), f.payUnit))} {periodLabel[f.payPeriod]}.
            </p>
          )}
        </div>
        <div className="field job-desc-field">
          <label htmlFor="job-description">Description</label>
          <textarea
            id="job-description"
            rows={5}
            maxLength={4000}
            value={f.description}
            onChange={set("description")}
            placeholder="What the work is, hours, and who to message in-game to apply."
          />
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="listing-actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Posting…" : "Post job"}
        </button>
      </div>
    </form>
  );
}
