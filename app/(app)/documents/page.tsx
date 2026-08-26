import { getCurrentUser } from "@/lib/session";
import { getMyDocuments } from "@/lib/documents";
import { DocumentRow } from "@/components/documents/DocumentRow";
import { SearchForm } from "@/components/documents/SearchForm";
import { EmptyState } from "@/components/documents/EmptyState";

export default async function MyDocumentsPage({ searchParams }: PageProps<"/documents">) {
  const params = await searchParams;
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim() : undefined;

  const user = await getCurrentUser();
  const documents = await getMyDocuments(user.id, query);
  const recent = query ? [] : documents.slice(0, 4);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
      <h1 className="font-serif text-2xl tracking-tight text-ink">My Documents</h1>
      <p className="mt-1 text-sm text-ink-muted">Documents you own.</p>

      <div className="mt-6">
        <SearchForm basePath="/documents" query={query} />
      </div>

      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Recent</h2>
          <div className="mt-2 overflow-hidden rounded-lg border border-border bg-surface">
            {recent.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} currentUserId={user.id} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {query ? `Results for "${query}"` : "All documents"}
        </h2>
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-surface">
          {documents.length === 0 ? (
            <EmptyState
              message={
                query ? "No documents match your search." : "You don't have any documents yet."
              }
            />
          ) : (
            documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} currentUserId={user.id} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
