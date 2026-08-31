import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Everything the app shares across every visitor — accounts, cars, houses —
// lives in one JSON blob under this key, mirroring the single-document
// model the site used when it ran as a Claude artifact.
const STATE_KEY = "foxmountain:state";
const ALLOWED_KEYS = ["accounts", "cars", "houses"];

// Vercel's Redis (Upstash) marketplace integration has used a couple of
// different env var names over time — check both so this keeps working
// whichever naming the dashboard hands you.
function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function emptyState() {
  return { accounts: [], cars: [], houses: [] };
}

function normalize(raw) {
  const state = emptyState();
  if (raw && typeof raw === "object") {
    for (const key of ALLOWED_KEYS) {
      if (Array.isArray(raw[key])) state[key] = raw[key];
    }
  }
  return state;
}

const NOT_CONFIGURED_MESSAGE =
  "Shared storage isn't configured yet. Add a Redis (Upstash) integration to this project from the Vercel Marketplace, then redeploy.";

export async function GET() {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }
  try {
    const raw = await redis.get(STATE_KEY);
    return NextResponse.json(normalize(raw));
  } catch (err) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }
}

export async function POST(req) {
  let patch;
  try {
    patch = await req.json();
  } catch (err) {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return NextResponse.json({ error: "Patch must be a JSON object." }, { status: 400 });
  }

  // Only ever accept the three known arrays, and only when they really are
  // arrays — this is the one server-side guardrail between a buggy or
  // malicious client and the shared state everyone else reads.
  const sanitizedPatch = {};
  for (const key of ALLOWED_KEYS) {
    if (Array.isArray(patch[key])) sanitizedPatch[key] = patch[key];
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  try {
    const current = normalize(await redis.get(STATE_KEY));
    const next = { ...current, ...sanitizedPatch };
    await redis.set(STATE_KEY, next);
    return NextResponse.json(next);
  } catch (err) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }
}
