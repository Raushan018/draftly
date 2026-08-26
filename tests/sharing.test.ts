import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// `getCurrentUser()` reads a cookie via `next/headers`, which only works inside
// a real Next.js request. Mocking it lets us exercise the actual exported
// server actions (not a reimplementation of their logic) as if a specific
// seeded user were logged in.
let mockCurrentUserId: string | undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "draftly_user_id" && mockCurrentUserId ? { value: mockCurrentUserId } : undefined,
    set: () => {},
  }),
}));

// `revalidatePath()` requires a real Next.js request's static-generation store,
// which doesn't exist when calling a server action directly from a test —
// it's a caching concern, not part of the authorization logic under test.
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

const { prisma } = await import("../lib/prisma");
const { getDocumentById, resolveAccess } = await import("../lib/documents");
const { shareDocument } = await import("../actions/sharing");

describe("document sharing and authorization", () => {
  let userA: { id: string };
  let userB: { id: string };
  let userC: { id: string };
  let documentId: string;

  beforeAll(async () => {
    const suffix = Date.now();
    userA = await prisma.user.create({
      data: { name: "Test Owner", email: `owner-${suffix}@test.local` },
    });
    userB = await prisma.user.create({
      data: { name: "Test Collaborator", email: `collaborator-${suffix}@test.local` },
    });
    userC = await prisma.user.create({
      data: { name: "Test Stranger", email: `stranger-${suffix}@test.local` },
    });

    const document = await prisma.document.create({
      data: {
        title: "Sharing Test Document",
        content: { type: "doc", content: [{ type: "paragraph" }] },
        ownerId: userA.id,
      },
    });
    documentId = document.id;
  });

  afterAll(async () => {
    await prisma.documentShare.deleteMany({ where: { documentId } });
    await prisma.document.deleteMany({ where: { id: documentId } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id, userC.id] } } });
    await prisma.$disconnect();
  });

  it("1. User A owns the document", async () => {
    const doc = await getDocumentById(documentId);
    expect(doc?.ownerId).toBe(userA.id);
    expect(resolveAccess(doc!, userA.id)).toEqual({
      canView: true,
      canEdit: true,
      isOwner: true,
    });
  });

  it("2. User A shares the document with User B", async () => {
    mockCurrentUserId = userA.id;

    const result = await shareDocument(documentId, userB.id, "EDIT");
    expect(result.ok).toBe(true);

    const shares = await prisma.documentShare.findMany({ where: { documentId, userId: userB.id } });
    expect(shares).toHaveLength(1);
    expect(shares[0].permission).toBe("EDIT");
  });

  it("3. User B can access the document", async () => {
    const doc = await getDocumentById(documentId);
    const access = resolveAccess(doc!, userB.id);
    expect(access).toEqual({ canView: true, canEdit: true, isOwner: false });
  });

  it("4. An unrelated user cannot access the document", async () => {
    const doc = await getDocumentById(documentId);
    const access = resolveAccess(doc!, userC.id);
    expect(access).toEqual({ canView: false, canEdit: false, isOwner: false });
  });

  it("5. Duplicate sharing is prevented — sharing again updates the one row, never adds a second", async () => {
    mockCurrentUserId = userA.id;

    const result = await shareDocument(documentId, userB.id, "VIEW");
    expect(result.ok).toBe(true);

    const shares = await prisma.documentShare.findMany({ where: { documentId, userId: userB.id } });
    expect(shares).toHaveLength(1);
    expect(shares[0].permission).toBe("VIEW");
  });

  it("rejects a share request from a non-owner", async () => {
    mockCurrentUserId = userB.id; // B is only a collaborator, not the owner

    const result = await shareDocument(documentId, userC.id, "EDIT");
    expect(result.ok).toBe(false);

    const shares = await prisma.documentShare.findMany({ where: { documentId, userId: userC.id } });
    expect(shares).toHaveLength(0);
  });

  it("rejects sharing with a user that doesn't exist", async () => {
    mockCurrentUserId = userA.id;

    const result = await shareDocument(documentId, "nonexistent-user-id", "EDIT");
    expect(result.ok).toBe(false);
  });
});
