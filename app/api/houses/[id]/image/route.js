import { currentSession } from "@/lib/auth";
import { fail, handleError } from "@/lib/api";
import { getHouseImage } from "@/lib/store";

// A listing's picture. Anyone signed in. Pictures never change once posted,
// so browsers can keep them for a day.
export async function GET(_req, { params }) {
  if (!(await currentSession())) return fail("Sign in to see the housing market.", 401);
  try {
    const { id } = await params;
    const image = await getHouseImage(id);
    if (!image) return fail("Picture not found.", 404);
    return new Response(Buffer.from(image.data, "base64"), {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (err) {
    return handleError(err, "Couldn't load the picture.");
  }
}
