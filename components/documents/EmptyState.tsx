import { FileX } from "lucide-react";

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <FileX className="h-5 w-5 text-ink-muted/60" />
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );
}
