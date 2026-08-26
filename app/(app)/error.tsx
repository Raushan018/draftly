"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AppError({
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
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <AlertTriangle className="h-5 w-5 text-danger" />
      <h1 className="mt-3 font-serif text-xl tracking-tight text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-muted">
        We couldn&apos;t complete that action. Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Try again
      </button>
    </div>
  );
}
