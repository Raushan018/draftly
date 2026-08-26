import { z } from "zod";

export const MAX_UPLOAD_SIZE_BYTES = 1024 * 1024; // 1MB
export const ALLOWED_UPLOAD_EXTENSIONS = [".txt", ".md"] as const;

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export const renameDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "Title cannot be empty").max(200, "Title is too long"),
});

export const updateDocumentContentSchema = z.object({
  id: z.string().min(1),
  content: z.unknown(),
});

export const shareDocumentSchema = z.object({
  documentId: z.string().min(1),
  targetUserId: z.string().min(1),
  permission: z.enum(["VIEW", "EDIT"]),
});

export const unshareDocumentSchema = z.object({
  documentId: z.string().min(1),
  targetUserId: z.string().min(1),
});

export const uploadFileMetaSchema = z.object({
  name: z
    .string()
    .refine(
      (name) => ALLOWED_UPLOAD_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)),
      { message: "Only .txt and .md files are supported" },
    ),
  size: z
    .number()
    .positive("File is empty")
    .max(MAX_UPLOAD_SIZE_BYTES, "File must be smaller than 1MB"),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type RenameDocumentInput = z.infer<typeof renameDocumentSchema>;
export type UpdateDocumentContentInput = z.infer<typeof updateDocumentContentSchema>;
export type ShareDocumentInput = z.infer<typeof shareDocumentSchema>;
export type UnshareDocumentInput = z.infer<typeof unshareDocumentSchema>;
export type UploadFileMetaInput = z.infer<typeof uploadFileMetaSchema>;
