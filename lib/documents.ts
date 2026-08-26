import { prisma } from "./prisma";

const DOCUMENT_LIST_SELECT = {
  id: true,
  title: true,
  updatedAt: true,
  ownerId: true,
  owner: { select: { id: true, name: true } },
  shares: { select: { userId: true, permission: true } },
} as const;

export type DocumentListItem = Awaited<ReturnType<typeof getMyDocuments>>[number];

export async function getMyDocuments(ownerId: string, query?: string) {
  return prisma.document.findMany({
    where: {
      ownerId,
      ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: DOCUMENT_LIST_SELECT,
  });
}

export async function getSharedWithMe(userId: string, query?: string) {
  return prisma.document.findMany({
    where: {
      shares: { some: { userId } },
      ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: DOCUMENT_LIST_SELECT,
  });
}

const DOCUMENT_DETAIL_SELECT = {
  id: true,
  title: true,
  content: true,
  ownerId: true,
  updatedAt: true,
  owner: { select: { id: true, name: true } },
  shares: { select: { userId: true, permission: true } },
} as const;

export async function getDocumentById(id: string) {
  return prisma.document.findUnique({
    where: { id },
    select: DOCUMENT_DETAIL_SELECT,
  });
}

export type DocumentDetail = NonNullable<Awaited<ReturnType<typeof getDocumentById>>>;

export function resolveAccess(doc: DocumentDetail, userId: string) {
  if (doc.ownerId === userId) {
    return { canView: true, canEdit: true, isOwner: true } as const;
  }
  const share = doc.shares.find((s) => s.userId === userId);
  if (!share) {
    return { canView: false, canEdit: false, isOwner: false } as const;
  }
  return { canView: true, canEdit: share.permission === "EDIT", isOwner: false } as const;
}

export type ShareTarget = {
  id: string;
  name: string;
  email: string;
  permission: "VIEW" | "EDIT" | null;
};

export async function getShareTargets(documentId: string, ownerId: string): Promise<ShareTarget[]> {
  const [users, shares] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: ownerId } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.documentShare.findMany({
      where: { documentId },
      select: { userId: true, permission: true },
    }),
  ]);

  const permissionByUserId = new Map(shares.map((s) => [s.userId, s.permission]));

  return users.map((user) => ({
    ...user,
    permission: permissionByUserId.get(user.id) ?? null,
  }));
}
