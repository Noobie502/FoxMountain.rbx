import { NextResponse } from "next/server";
import { currentSession, isDeveloper } from "@/lib/auth";
import { fail, handleError, readJson } from "@/lib/api";
import { getNotes, saveNotes } from "@/lib/store";

export const dynamic = "force-dynamic";

// The database rejects single writes over about 1 MB, so this is the only cap:
// roughly 800,000 characters of ordinary text.
const NOTES_MAX_BYTES = 800_000;

// Read the notes. Anyone signed in.
export async function GET() {
  if (!(await currentSession())) return fail("Sign in to see the notes.", 401);
  try {
    return NextResponse.json(await getNotes());
  } catch (err) {
    return handleError(err, "Couldn't load the notes. Try again.");
  }
}

// Replace the notes. Developer only.
// Body: { text, baseUpdatedAt } — baseUpdatedAt is the version the editor started
// from, so saving over a newer version (e.g. from another tab) is refused.
export async function PUT(req) {
  if (!(await isDeveloper())) return fail("Only the developer can edit the notes.", 403);
  const body = await readJson(req);
  if (!body || typeof body.text !== "string") return fail("Send the notes text as JSON.");
  if (Buffer.byteLength(body.text, "utf8") > NOTES_MAX_BYTES) {
    return fail("The notes are too long to save in one go (about 800,000 characters is the most). Move some into a second page.", 413);
  }
  try {
    const current = await getNotes();
    if (body.force !== true && (current.updatedAt ?? null) !== (body.baseUpdatedAt ?? null)) {
      return NextResponse.json(
        { error: "The notes were changed somewhere else since you opened them.", latest: current },
        { status: 409 }
      );
    }
    const next = { text: body.text, updatedAt: new Date().toISOString() };
    await saveNotes(next);
    return NextResponse.json(next);
  } catch (err) {
    return handleError(err, "Couldn't save the notes. Try again.");
  }
}
