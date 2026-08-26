import { Search } from "lucide-react";

export function SearchForm({ basePath, query }: { basePath: string; query?: string }) {
  return (
    <form action={basePath} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        name="q"
        defaultValue={query}
        placeholder="Search documents"
        className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </form>
  );
}
