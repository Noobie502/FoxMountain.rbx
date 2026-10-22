import { NextResponse } from "next/server";
import { developerAccount, isDeveloper } from "@/lib/auth";
import { listAccounts, StorageNotConfiguredError } from "@/lib/store";

export const dynamic = "force-dynamic";

// Every account, with passwords. Developer only.
export async function GET() {
  if (!(await isDeveloper())) {
    return NextResponse.json({ error: "Developer sign-in required." }, { status: 401 });
  }
  try {
    const accounts = (await listAccounts()).map(developerAccount);
    return NextResponse.json({ accounts });
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(err);
    return NextResponse.json({ error: "Couldn't load accounts. Try again." }, { status: 500 });
  }
}
