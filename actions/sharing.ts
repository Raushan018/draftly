"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { shareDocumentSchema, unshareDocumentSchema } from "@/lib/validation";
import { toFriendlyError } from "@/lib/errors";

type ShareResult = { ok: true } | { ok: false; error: string };

async function assertOwner(documentId: string, userId: string): Promise<ShareResult> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true },
  });

  if (!document) return { ok: false, error: "This document no longer exists." };
  if (document.ownerId !== userId) {
    return { ok: false, error: "Only the owner can manage sharing." };
  }
  return { ok: true };
}

export async function shareDocument(
  documentId: string,
  targetUserId: string,
  permission: "VIEW" | "EDIT",
): Promise<ShareResult> {
  const parsed = shareDocumentSchema.safeParse({ documentId, targetUserId, permission });
  if (!parsed.success) {
    return { ok: false, error: "Invalid share request." };
  }

  try {
    const user = await getCurrentUser();
    const ownerCheck = await assertOwner(documentId, user.id);
    if (!ownerCheck.ok) return ownerCheck;

    if (targetUserId === user.id) {
      return { ok: false, error: "You already own this document." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!targetUser) {
      return { ok: false, error: "That user doesn't exist." };
    }

    // Upsert keyed on the (documentId, userId) unique constraint — sharing with
    // the same user again always updates the single existing row, never duplicates it.
    await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId, userId: targetUserId } },
      update: { permission },
      create: { documentId, userId: targetUserId, permission },
    });
  } catch (error) {
    return { ok: false, error: toFriendlyError(error, "Couldn't update sharing. Please try again.") };
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents/shared");
  return { ok: true };
}

export async function unshareDocument(
  documentId: string,
  targetUserId: string,
): Promise<ShareResult> {
  const parsed = unshareDocumentSchema.safeParse({ documentId, targetUserId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
  }

  try {
    const user = await getCurrentUser();
    const ownerCheck = await assertOwner(documentId, user.id);
    if (!ownerCheck.ok) return ownerCheck;

    await prisma.documentShare.deleteMany({ where: { documentId, userId: targetUserId } });
  } catch (error) {
    return { ok: false, error: toFriendlyError(error, "Couldn't update sharing. Please try again.") };
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents/shared");
  return { ok: true };
}
