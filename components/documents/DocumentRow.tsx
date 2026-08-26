import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";

type DocumentRowDoc = {
  id: string;
  title: string;
  updatedAt: Date;
  ownerId: string;
  owner: { id: string; name: string };
  shares: { userId: string; permission: "VIEW" | "EDIT" }[];
};

export function DocumentRow({
  doc,
  currentUserId,
}: {
  doc: DocumentRowDoc;
  currentUserId: string;
}) {
  const isOwner = doc.ownerId === currentUserId;
  const share = doc.shares.find((s) => s.userId === currentUserId);
  const statusLabel = isOwner
    ? "Owned"
    : share?.permission === "EDIT"
      ? "Shared · Editor"
      : "Shared · Viewer";

  return (
    <Link
      href={`/documents/${doc.id}`}
      className="group flex items-center justify-between gap-4 border-b border-border px-4 py-3 outline-none transition-colors last:border-b-0 hover:bg-accent-soft/40 focus-visible:bg-accent-soft/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[15px] font-medium text-ink group-hover:text-accent">
          {doc.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">{doc.owner.name}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="hidden text-xs text-ink-muted sm:inline">
          {formatRelativeTime(doc.updatedAt)}
        </span>
        <span
          className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${
            isOwner
              ? "border-border text-ink-muted"
              : "border-accent/30 bg-accent-soft text-accent"
          }`}
        >
          {statusLabel}
        </span>
      </div>
    </Link>
  );
}
