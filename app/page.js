import { redirect } from "next/navigation";
import { currentUsername, isDeveloper } from "@/lib/auth";
import AuthPanel from "./AuthPanel";
import Emerald from "./Emerald";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (await isDeveloper()) redirect("/dev");
  if (await currentUsername()) redirect("/account");

  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">
          <Emerald size={22} />
          M-Bank
        </span>
      </header>

      <main className="home">
        <div className="intro">
          <p className="eyebrow">The server bank</p>
          <h1>Keep your emeralds somewhere safer than a chest.</h1>
          <p className="lede">
            Open an M-Bank account with your Minecraft username. Every account is locked with its own password, so
            only you can get in.
          </p>
          <ul className="facts">
            <li>
              <strong>One account per player</strong>
              <span>Tied to your Minecraft username.</span>
            </li>
            <li>
              <strong>Password required</strong>
              <span>4–8 characters, set when you open the account.</span>
            </li>
            <li>
              <strong>Locks after 5 wrong tries</strong>
              <span>For 10 minutes, to stop guessing.</span>
            </li>
          </ul>
        </div>
        <AuthPanel />
      </main>
    </div>
  );
}
