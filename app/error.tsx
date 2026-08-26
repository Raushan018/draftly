"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <AlertTriangle className="h-5 w-5 text-danger" />
        <h1 className="mt-3 font-serif text-xl tracking-tight text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Draftly couldn&apos;t load. This is usually temporary — please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
