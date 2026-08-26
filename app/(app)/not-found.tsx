import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <FileQuestion className="h-5 w-5 text-ink-muted" />
      <h1 className="mt-3 font-serif text-xl tracking-tight text-ink">Document not found</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This document doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/documents"
        className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Back to My Documents
      </Link>
    </div>
  );
}
