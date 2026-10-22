// M-Bank keeps every balance as a whole number of diamonds.
// 1 emerald = 10 diamonds.
export const DIAMONDS_PER_EMERALD = 10;

export function toDiamonds(amount, unit) {
  return unit === "emeralds" ? amount * DIAMONDS_PER_EMERALD : amount;
}

export function splitBalance(totalDiamonds) {
  const total = Math.max(0, Math.trunc(totalDiamonds || 0));
  return {
    emeralds: Math.floor(total / DIAMONDS_PER_EMERALD),
    diamonds: total % DIAMONDS_PER_EMERALD,
    total,
  };
}

const n = (x) => x.toLocaleString("en-US");
const plural = (x, word) => `${n(x)} ${word}${x === 1 ? "" : "s"}`;

// "12 emeralds, 4 diamonds" / "3 emeralds" / "7 diamonds" / "0 emeralds"
export function formatBalance(totalDiamonds) {
  const { emeralds, diamonds } = splitBalance(totalDiamonds);
  if (emeralds && diamonds) return `${plural(emeralds, "emerald")}, ${plural(diamonds, "diamond")}`;
  if (diamonds) return plural(diamonds, "diamond");
  return plural(emeralds, "emerald");
}

export function formatAmount(amount, unit) {
  return plural(amount, unit === "emeralds" ? "emerald" : "diamond");
}
