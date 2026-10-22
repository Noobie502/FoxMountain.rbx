import { DIAMONDS_PER_EMERALD, formatAmount, splitBalance } from "@/lib/money";
import { Gem } from "./Emerald";

// Big balance readout: emeralds and leftover diamonds side by side.
export function BalanceFigure({ totalDiamonds, size = "large" }) {
  const { emeralds, diamonds, total } = splitBalance(totalDiamonds);
  const gem = size === "large" ? 36 : 26;
  return (
    <div className={`balance balance-${size}`}>
      <span className="balance-part">
        <Gem kind="emerald" size={gem} />
        <span className="balance-figure">{emeralds.toLocaleString("en-US")}</span>
        <span className="balance-unit">{emeralds === 1 ? "emerald" : "emeralds"}</span>
      </span>
      <span className="balance-part">
        <Gem kind="diamond" size={gem} />
        <span className="balance-figure">{diamonds}</span>
        <span className="balance-unit">{diamonds === 1 ? "diamond" : "diamonds"}</span>
      </span>
      <span className="balance-total">
        = {total.toLocaleString("en-US")} diamonds in total · 1 emerald = {DIAMONDS_PER_EMERALD} diamonds
      </span>
    </div>
  );
}

export function Activity({ history, emptyText }) {
  if (!history?.length) return <p className="activity-empty">{emptyText}</p>;
  return (
    <ul className="activity">
      {history.map((h, i) => (
        <li key={`${h.at}-${i}`}>
          <span className={`activity-amount ${h.deltaDiamonds >= 0 ? "plus" : "minus"}`}>
            {h.deltaDiamonds >= 0 ? "+" : "−"}
            {formatAmount(h.amount, h.unit)}
          </span>
          <span className="activity-what">{h.action === "add" ? "Added by the developer" : "Removed by the developer"}</span>
          <time dateTime={h.at}>
            {new Date(h.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </time>
        </li>
      ))}
    </ul>
  );
}
