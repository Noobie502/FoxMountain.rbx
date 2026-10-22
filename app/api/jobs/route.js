import { NextResponse } from "next/server";
import { currentSession, isDeveloper } from "@/lib/auth";
import { fail, handleError, readJson } from "@/lib/api";
import { readJob } from "@/lib/jobs";
import { createJob, listJobs } from "@/lib/store";

export const dynamic = "force-dynamic";

// All job listings. Anyone signed in.
export async function GET() {
  if (!(await currentSession())) return fail("Sign in to see jobs.", 401);
  try {
    return NextResponse.json({ jobs: await listJobs() });
  } catch (err) {
    return handleError(err, "Couldn't load jobs. Try again.");
  }
}

// Post a job. Developer only.
// Body: { title, pay, payUnit, payPeriod, location?, description }
export async function POST(req) {
  if (!(await isDeveloper())) return fail("Only the developer can post jobs.", 403);
  const body = await readJson(req);
  if (!body) return fail("Send the job as JSON.");
  const { job, error } = readJob(body);
  if (error) return fail(error);
  try {
    await createJob(job);
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return handleError(err, "Couldn't post the job. Try again.");
  }
}
