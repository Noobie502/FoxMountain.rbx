import { requireViewer } from "@/lib/viewer";
import { getNotes, StorageNotConfiguredError } from "@/lib/store";
import AppShell from "../AppShell";
import Notes from "./Notes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notes · M-Bank" };

export default async function NotesPage() {
  let viewer;
  let notes = { text: "", updatedAt: null };
  let storageError = null;
  try {
    viewer = await requireViewer();
    notes = await getNotes();
  } catch (err) {
    if (!(err instanceof StorageNotConfiguredError)) throw err;
    storageError = err.message;
  }

  return (
    <AppShell role={viewer?.role ?? "player"} active="notes">
      {storageError ? <p className="error page-error">{storageError}</p> : <Notes initial={notes} canEdit={viewer.role === "developer"} />}
    </AppShell>
  );
}
