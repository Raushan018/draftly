"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { uploadFileMetaSchema } from "@/lib/validation";
import { convertToTiptapDoc } from "@/lib/markdown-to-tiptap";
import { toFriendlyError } from "@/lib/errors";

type UploadResult = { ok: true; documentId: string } | { ok: false; error: string };

export async function uploadAndConvert(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file was selected." };
  }

  const meta = uploadFileMetaSchema.safeParse({ name: file.name, size: file.size });
  if (!meta.success) {
    return { ok: false, error: meta.error.issues[0]?.message ?? "That file isn't supported." };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "Couldn't read that file. Please try a different one." };
  }

  if (!text.trim()) {
    return { ok: false, error: "That file is empty." };
  }

  try {
    const isMarkdown = file.name.toLowerCase().endsWith(".md");
    const content = convertToTiptapDoc(text, isMarkdown ? "markdown" : "text");
    const title = file.name.replace(/\.(md|txt)$/i, "").trim() || "Untitled document";

    const user = await getCurrentUser();
    const document = await prisma.document.create({
      data: { title, content: content as Prisma.InputJsonValue, ownerId: user.id },
    });

    revalidatePath("/documents");
    return { ok: true, documentId: document.id };
  } catch (error) {
    return { ok: false, error: toFriendlyError(error, "Couldn't import that file. Please try again.") };
  }
}
