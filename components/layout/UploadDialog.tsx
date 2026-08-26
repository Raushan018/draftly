"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { uploadAndConvert } from "@/actions/upload";
import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES } from "@/lib/validation";

function validateFile(file: File): string | null {
  const hasAllowedExtension = ALLOWED_UPLOAD_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );
  if (!hasAllowedExtension) {
    return "Unsupported file type. Only .txt and .md files are supported.";
  }
  if (file.size === 0) {
    return "File is empty.";
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return "File must be smaller than 1MB.";
  }
  return null;
}

export function UploadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [fileSelected, setFileSelected] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileSelected(Boolean(file));
    if (!file) {
      setError(null);
      return;
    }
    setError(validateFile(file));
  }

  async function handleSubmit(formData: FormData) {
    const file = formData.get("file");
    if (file instanceof File) {
      const clientError = validateFile(file);
      if (clientError) {
        setError(clientError);
        return;
      }
    }

    setPending(true);
    setError(null);
    const result = await uploadAndConvert(formData);

    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    setOpen(false);
    formRef.current?.reset();
    setFileSelected(false);
    router.push(`/documents/${result.documentId}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-ink-muted outline-none transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Upload className="h-4 w-4" />
        Upload
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-ink">Upload a document</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-ink-muted outline-none transition-colors hover:bg-bg hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label="Close"
                disabled={pending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs font-medium text-ink-muted">
              Supported files: .txt and .md
            </p>

            <form ref={formRef} action={handleSubmit} className="mt-4">
              <input
                type="file"
                name="file"
                accept=".txt,.md"
                required
                onChange={handleFileChange}
                disabled={pending}
                className="block w-full rounded-md border border-dashed border-border bg-bg px-3 py-6 text-sm text-ink-muted outline-none file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
              />
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={pending || !fileSelected || Boolean(error)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Uploading…
                  </>
                ) : (
                  "Upload"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
