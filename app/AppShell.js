import Link from "next/link";
import Emerald from "./Emerald";
import { SignOutButton } from "./account/controls";

// Pixel icons on an 8×8 grid, matching the gems.
function PixelIcon({ rows, color = "currentColor" }) {
  const rects = [];
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === "#") rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} />);
    })
  );
  return (
    <svg width="18" height="18" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true" className="nav-icon">
      {rects}
    </svg>
  );
}

const HOUSE = ["...##...", "..####..", ".######.", "########", ".#....#.", ".#.##.#.", ".#.##.#.", ".######."];
const VAULT = ["########", "#......#", "#.####.#", "#.#..#.#", "#.#..#.#", "#.####.#", "#......#", "########"];

// Every signed-in page uses this frame: top bar + sidebar (a tab bar on phones).
// Players and the developer see the same sidebar; "Bank" goes to each one's own home.
export default function AppShell({ role, active, children }) {
  const bankHref = role === "developer" ? "/dev" : "/account";
  const bankLabel = role === "developer" ? "Developer dashboard" : "My account";
  const items = [
    { key: "market", href: "/market", label: "Housing market", icon: HOUSE },
    { key: "bank", href: bankHref, label: bankLabel, icon: VAULT },
  ];

  return (
    <div className="app">
      <header className="app-topbar">
        <Link href={bankHref} className="wordmark">
          <Emerald size={22} />
          M-Bank
          {role === "developer" && <span className="dev-badge">Developer</span>}
        </Link>
        <SignOutButton />
      </header>
      <div className="app-body">
        <nav className="sidebar" aria-label="M-Bank">
          <ul>
            {items.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="nav-link" aria-current={active === item.key ? "page" : undefined}>
                  <PixelIcon rows={item.icon} />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="app-main">{children}</div>
      </div>
    </div>
  );
}
