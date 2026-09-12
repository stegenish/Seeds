import { Check, LoaderCircle } from "lucide-react";
import type { CatalogProgress } from "@/lib/catalog/sync";

export type CatalogSyncState =
  | { status: "loading" }
  | { status: "syncing"; progress: CatalogProgress }
  | { status: "ready" }
  | { status: "error"; message: string };

export function CatalogStatus({
  state,
  talkCount,
}: {
  state: CatalogSyncState;
  talkCount: number;
}) {
  if (state.status === "error") {
    return (
      <span className="catalog-status catalog-status-error" title={state.message}>
        Archive paused · {talkCount.toLocaleString()} available
      </span>
    );
  }

  if (state.status === "syncing") {
    const { completed, total, resource } = state.progress;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 100;
    return (
      <span className="catalog-status" aria-live="polite">
        <LoaderCircle className="spin" size={14} aria-hidden="true" />
        {resource === "teachers" ? "Teachers" : "Talks"} {percent}%
      </span>
    );
  }

  if (state.status === "loading") {
    return <span className="catalog-status">Opening local archive…</span>;
  }

  return (
    <span className="catalog-status">
      <Check size={14} aria-hidden="true" /> {talkCount.toLocaleString()} ready
    </span>
  );
}
