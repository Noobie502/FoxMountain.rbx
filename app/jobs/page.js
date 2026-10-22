import { requireViewer } from "@/lib/viewer";
import { listJobs, StorageNotConfiguredError } from "@/lib/store";
import AppShell from "../AppShell";
import Jobs from "./Jobs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jobs · M-Bank" };

export default async function JobsPage() {
  let viewer;
  let jobs = [];
  let storageError = null;
  try {
    viewer = await requireViewer();
    jobs = await listJobs();
  } catch (err) {
    if (!(err instanceof StorageNotConfiguredError)) throw err;
    storageError = err.message;
  }

  return (
    <AppShell role={viewer?.role ?? "player"} active="jobs">
      {storageError ? <p className="error page-error">{storageError}</p> : <Jobs initialJobs={jobs} canPost={viewer.role === "developer"} />}
    </AppShell>
  );
}
