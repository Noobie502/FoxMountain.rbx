import { randomBytes } from "node:crypto";
import { toDiamonds } from "./money";

// Images are resized in the browser before upload; this is the server's hard cap.
export const MAX_IMAGE_BYTES = 700 * 1024;
const IMAGE_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

const int = (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v);

// Validates a new listing. Returns { house, image } or { error }.
export function readListing(body) {
  const address = typeof body?.address === "string" ? body.address.trim().replace(/\s+/g, " ") : "";
  if (address.length < 3 || address.length > 120) return { error: "Enter the address (3–120 characters)." };

  const bedrooms = int(body?.bedrooms);
  if (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 50) return { error: "Bedrooms must be a whole number from 0 to 50." };

  const bathrooms = int(body?.bathrooms);
  if (typeof bathrooms !== "number" || !Number.isFinite(bathrooms) || bathrooms < 0 || bathrooms > 50 || (bathrooms * 2) % 1 !== 0) {
    return { error: "Bathrooms must be from 0 to 50, in steps of 0.5." };
  }

  const squareFeet = int(body?.squareFeet);
  if (!Number.isInteger(squareFeet) || squareFeet < 1 || squareFeet > 1_000_000) {
    return { error: "Square feet must be a whole number from 1 to 1,000,000." };
  }

  const price = int(body?.price);
  const unit = body?.priceUnit;
  if (unit !== "emeralds" && unit !== "diamonds") return { error: "Choose emeralds or diamonds for the price." };
  if (!Number.isInteger(price) || price < 1 || price > 1_000_000) return { error: "Enter a price from 1 to 1,000,000." };

  const match = typeof body?.image === "string" ? IMAGE_RE.exec(body.image) : null;
  if (!match) return { error: "Add a picture of the property (JPEG, PNG or WebP)." };
  const bytes = Buffer.byteLength(match[2], "base64");
  if (bytes > MAX_IMAGE_BYTES) return { error: "That picture is too large. Try a smaller one." };

  const id = randomBytes(6).toString("hex");
  return {
    house: {
      id,
      address,
      bedrooms,
      bathrooms,
      squareFeet,
      priceDiamonds: toDiamonds(price, unit),
      status: "for-sale",
      createdAt: new Date().toISOString(),
    },
    image: { contentType: match[1], data: match[2] },
  };
}

export function publicHouse(house) {
  return { ...house, imageUrl: `/api/houses/${house.id}/image` };
}
