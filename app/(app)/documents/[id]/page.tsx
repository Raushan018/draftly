import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDocumentById, getShareTargets, resolveAccess } from "@/lib/documents";
import { DocumentEditor } from "@/components/editor/DocumentEditor";

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;

  const user = await getCurrentUser();
  const document = await getDocumentById(id);

  if (!document) {
    notFound();
  }

  const access = resolveAccess(document, user.id);
  if (!access.canView) {
    notFound();
  }

  const shareTargets = access.isOwner ? await getShareTargets(document.id, document.ownerId) : [];

  return (
    <DocumentEditor
      documentId={document.id}
      title={document.title}
      content={document.content}
      ownerName={document.owner.name}
      canEdit={access.canEdit}
      isOwner={access.isOwner}
      shareTargets={shareTargets}
    />
  );
}
