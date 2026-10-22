import { NextResponse } from "next/server";
import { isDeveloper } from "@/lib/auth";
import { fail, handleError } from "@/lib/api";
import { deleteHouse, getHouse } from "@/lib/store";

// Take a listing down. Developer only.
export async function DELETE(_req, { params }) {
  if (!(await isDeveloper())) return fail("Only the developer can remove listings.", 403);
  try {
    const { id } = await params;
    if (!(await getHouse(id))) return fail("That listing no longer exists.", 404);
    await deleteHouse(id);
    return NextResponse.json({ deleted: id });
  } catch (err) {
    return handleError(err, "Couldn't remove the listing. Try again.");
  }
}
