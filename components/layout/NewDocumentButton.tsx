"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import type { CreateDocumentState } from "@/actions/documents";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {pending ? "Creating…" : "New document"}
    </button>
  );
}

export function NewDocumentForm({
  action,
}: {
  action: (state: CreateDocumentState, formData: FormData) => Promise<CreateDocumentState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction}>
      <SubmitButton />
      {state.error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
