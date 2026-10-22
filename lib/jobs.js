import { randomBytes } from "node:crypto";
import { toDiamonds } from "./money";

export const PAY_PERIODS = {
  shift: "per shift",
  hour: "per hour",
  day: "per day",
  week: "per week",
  once: "one-off",
};

const clean = (v) => (typeof v === "string" ? v.trim().replace(/[ \t]+/g, " ") : "");
const int = (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v);

// Validates a new job listing. Returns { job } or { error }.
export function readJob(body) {
  const title = clean(body?.title);
  if (title.length < 2 || title.length > 80) return { error: "Enter a job title (2–80 characters)." };

  const pay = int(body?.pay);
  const unit = body?.payUnit;
  if (unit !== "emeralds" && unit !== "diamonds") return { error: "Choose emeralds or diamonds for the pay." };
  if (!Number.isInteger(pay) || pay < 1 || pay > 1_000_000) return { error: "Enter the pay as a whole number from 1 to 1,000,000." };

  const period = body?.payPeriod;
  if (!PAY_PERIODS[period]) return { error: "Choose how often the job pays." };

  const location = clean(body?.location);
  if (location.length > 80) return { error: "Keep the location under 80 characters." };

  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (description.length < 1) return { error: "Describe the job: what the work is and who to contact." };
  if (description.length > 4000) return { error: "Keep the description under 4,000 characters." };

  return {
    job: {
      id: randomBytes(6).toString("hex"),
      title,
      payDiamonds: toDiamonds(pay, unit),
      payPeriod: period,
      location,
      description,
      createdAt: new Date().toISOString(),
    },
  };
}
