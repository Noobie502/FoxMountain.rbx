import { NextResponse } from "next/server";
import { AccountBusyError, StorageNotConfiguredError } from "./store";

// Shared helpers for the API routes.

export const fail = (error, status = 400) => NextResponse.json({ error }, { status });

export async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return null;
  }
}

export function handleError(err, fallback) {
  if (err instanceof StorageNotConfiguredError) return fail(err.message, 503);
  if (err instanceof AccountBusyError) return fail(err.message, 409);
  console.error(err);
  return fail(fallback, 500);
}

const MAX_AMOUNT = 1_000_000;

// Validates { amount, unit } from a request body.
export function readAmount(body) {
  const amount = Number(body?.amount);
  const unit = body?.unit;
  if (unit !== "emeralds" && unit !== "diamonds") return { error: "Choose emeralds or diamonds." };
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
    return { error: `Enter a whole number from 1 to ${MAX_AMOUNT.toLocaleString("en-US")}.` };
  }
  return { amount, unit };
}

export function addHistory(account, entry) {
  account.history = [{ at: new Date().toISOString(), ...entry }, ...(account.history ?? [])].slice(0, 50);
}
