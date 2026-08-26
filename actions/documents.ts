"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDocumentById, resolveAccess } from "@/lib/documents";
import { renameDocumentSchema, updateDocumentContentSchema } from "@/lib/validation";
import { toFriendlyError } from "@/lib/errors";

const EMPTY_DOCUMENT = { type: "doc", content: [{ type: "paragraph" }] };

export type CreateDocumentState = { error?: string };

export async function createDocument(
  _prevState: CreateDocumentState,
  _formData: FormData,
): Promise<CreateDocumentState> {
  let documentId: string;
  try {
    const user = await getCurrentUser();
    const document = await prisma.document.create({
      data: { title: "Untitled document", content: EMPTY_DOCUMENT, ownerId: user.id },
    });
    documentId = document.id;
  } catch (error) {
    return { error: toFriendlyError(error, "Couldn't create the document. Please try again.") };
  }

  revalidatePath("/documents");
  redirect(`/documents/${documentId}`);
}

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateDocumentContent(
  id: string,
  content: unknown,
): Promise<ActionResult> {
  const parsed = updateDocumentContentSchema.safeParse({ id, content });
  if (!parsed.success) {
    return { ok: false, error: "Invalid document content." };
  }

  try {
    const user = await getCurrentUser();
    const document = await getDocumentById(id);
    if (!document) {
      return { ok: false, error: "This document no longer exists." };
    }

    const access = resolveAccess(document, user.id);
    if (!access.canEdit) {
      return { ok: false, error: "You don't have permission to edit this document." };
    }

    await prisma.document.update({
      where: { id },
      data: { content: content as Prisma.InputJsonValue },
    });
  } catch (error) {
    return { ok: false, error: toFriendlyError(error, "Couldn't save your changes. Please try again.") };
  }

  revalidatePath(`/documents/${id}`);
  return { ok: true };
}

export async function renameDocument(id: string, title: string): Promise<ActionResult> {
  const parsed = renameDocumentSchema.safeParse({ id, title });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid title." };
  }

  try {
    const user = await getCurrentUser();
    const document = await getDocumentById(id);
    if (!document) {
      return { ok: false, error: "This document no longer exists." };
    }

    const access = resolveAccess(document, user.id);
    if (!access.canEdit) {
      return { ok: false, error: "You don't have permission to rename this document." };
    }

    await prisma.document.update({
      where: { id },
      data: { title: parsed.data.title },
    });
  } catch (error) {
    return { ok: false, error: toFriendlyError(error, "Couldn't rename the document. Please try again.") };
  }

  revalidatePath(`/documents/${id}`);
  revalidatePath("/documents");
  revalidatePath("/documents/shared");
  return { ok: true };
}
