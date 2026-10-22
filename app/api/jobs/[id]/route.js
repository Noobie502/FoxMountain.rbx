import { NextResponse } from "next/server";
import { isDeveloper } from "@/lib/auth";
import { fail, handleError } from "@/lib/api";
import { deleteJob } from "@/lib/store";

// Take a job listing down. Developer only.
export async function DELETE(_req, { params }) {
  if (!(await isDeveloper())) return fail("Only the developer can remove jobs.", 403);
  try {
    const { id } = await params;
    if (!(await deleteJob(id))) return fail("That job no longer exists.", 404);
    return NextResponse.json({ deleted: id });
  } catch (err) {
    return handleError(err, "Couldn't remove the job. Try again.");
  }
}
