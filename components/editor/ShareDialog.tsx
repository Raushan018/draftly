"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Share2, X } from "lucide-react";
import { shareDocument, unshareDocument } from "@/actions/sharing";
import type { ShareTarget } from "@/lib/documents";

type Permission = "VIEW" | "EDIT";

const PERMISSION_LABEL: Record<Permission, string> = {
  VIEW: "Viewer",
  EDIT: "Editor",
};

type Feedback = { type: "success" | "error"; message: string };

export function ShareDialog({
  documentId,
  ownerName,
  targets,
}: {
  documentId: string;
  ownerName: string;
  targets: ShareTarget[];
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, startTransition] = useTransition();

  const available = useMemo(() => targets.filter((t) => t.permission === null), [targets]);
  const shared = useMemo(() => targets.filter((t) => t.permission !== null), [targets]);

  const [selectedUserId, setSelectedUserId] = useState(() => available[0]?.id ?? "");
  const [selectedPermission, setSelectedPermission] = useState<Permission>("EDIT");

  const currentSelection = available.find((t) => t.id === selectedUserId) ?? available[0];

  useEffect(() => {
    if (feedback?.type !== "success") return;
    const timeout = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  function handleShareSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!currentSelection) return;

    setFeedback(null);
    startTransition(async () => {
      const result = await shareDocument(documentId, currentSelection.id, selectedPermission);
      if (result.ok) {
        setFeedback({
          type: "success",
          message: `Shared with ${currentSelection.name} as ${PERMISSION_LABEL[selectedPermission]}.`,
        });
        setSelectedUserId("");
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  function handlePermissionChange(target: ShareTarget, value: string) {
    setFeedback(null);
    startTransition(async () => {
      const result =
        value === ""
          ? await unshareDocument(documentId, target.id)
          : await shareDocument(documentId, target.id, value as Permission);

      if (result.ok) {
        setFeedback({
          type: "success",
          message: value === "" ? `Removed ${target.name}'s access.` : `Updated ${target.name}'s access.`,
        });
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-ink outline-none transition-colors hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-ink">Share document</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-ink-muted outline-none transition-colors hover:bg-bg hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {available.length > 0 ? (
              <form onSubmit={handleShareSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-ink-muted" htmlFor="share-user">
                    User
                  </label>
                  <select
                    id="share-user"
                    value={currentSelection?.id ?? ""}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    disabled={pending}
                    className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-ink outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-60"
                  >
                    {available.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted" htmlFor="share-permission">
                    Permission
                  </label>
                  <select
                    id="share-permission"
                    value={selectedPermission}
                    onChange={(event) => setSelectedPermission(event.target.value as Permission)}
                    disabled={pending}
                    className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-ink outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-60"
                  >
                    <option value="EDIT">Editor</option>
                    <option value="VIEW">Viewer</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={pending || !currentSelection}
                  className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Sharing…" : "Share"}
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">Everyone already has access.</p>
            )}

            {feedback && (
              <p
                role="status"
                className={`mt-3 text-sm ${
                  feedback.type === "success" ? "text-accent" : "text-danger"
                }`}
              >
                {feedback.message}
              </p>
            )}

            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Current access
              </p>
              <ul className="mt-2 space-y-2">
                <li className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-ink">{ownerName}</span>
                  <span className="shrink-0 text-xs text-ink-muted">Owner</span>
                </li>
                {shared.map((target) => (
                  <li key={target.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-ink">{target.name}</span>
                    <select
                      value={target.permission ?? ""}
                      disabled={pending}
                      onChange={(event) => handlePermissionChange(target, event.target.value)}
                      className="shrink-0 rounded-md border border-border bg-bg px-2 py-1 text-xs text-ink outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-60"
                    >
                      <option value="EDIT">Editor</option>
                      <option value="VIEW">Viewer</option>
                      <option value="">Remove access</option>
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
