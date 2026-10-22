import { NextResponse } from "next/server";
import { currentSession, isDeveloper } from "@/lib/auth";
import { fail, handleError, readJson } from "@/lib/api";
import { publicHouse, readListing } from "@/lib/houses";
import { createHouse, listHouses } from "@/lib/store";

export const dynamic = "force-dynamic";

// All listings. Anyone signed in.
export async function GET() {
  if (!(await currentSession())) return fail("Sign in to see the housing market.", 401);
  try {
    return NextResponse.json({ houses: (await listHouses()).map(publicHouse) });
  } catch (err) {
    return handleError(err, "Couldn't load the housing market. Try again.");
  }
}

// Post a property for sale. Developer only.
// Body: { address, bedrooms, bathrooms, squareFeet, price, priceUnit, image (data URL) }
export async function POST(req) {
  if (!(await isDeveloper())) return fail("Only the developer can list properties.", 403);
  const body = await readJson(req);
  if (!body) return fail("Send the listing as JSON.");
  const { house, image, error } = readListing(body);
  if (error) return fail(error);
  try {
    await createHouse(house, image);
    return NextResponse.json({ house: publicHouse(house) }, { status: 201 });
  } catch (err) {
    return handleError(err, "Couldn't post the listing. Try again.");
  }
}
