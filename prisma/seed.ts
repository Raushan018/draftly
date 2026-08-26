import { prisma } from "../lib/prisma";
import type { Prisma } from "@prisma/client";

const SEED_USERS = [
  { name: "Raushan Kumar", email: "raushan@test.com" },
  { name: "Test User", email: "test@example.com" },
];

function heading(level: 1 | 2, text: string) {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

function paragraph(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function bulletList(items: string[]) {
  return {
    type: "bulletList",
    content: items.map((text) => ({
      type: "listItem",
      content: [paragraph(text)],
    })),
  };
}

function orderedList(items: string[]) {
  return {
    type: "orderedList",
    content: items.map((text) => ({
      type: "listItem",
      content: [paragraph(text)],
    })),
  };
}

const roadmapDoc: Prisma.JsonObject = {
  type: "doc",
  content: [
    heading(1, "Q3 Product Roadmap"),
    paragraph(
      "Draft priorities for the quarter. Move items between sections as scope firms up.",
    ),
    heading(2, "Now"),
    bulletList([
      "Ship document sharing between teammates",
      "Add markdown import for existing notes",
      "Stabilize autosave on the editor",
    ]),
    heading(2, "Next"),
    orderedList(["Version history", "Comment threads", "Export to PDF"]),
  ],
};

const kickoffDoc: Prisma.JsonObject = {
  type: "doc",
  content: [
    heading(1, "Kickoff Meeting Notes"),
    paragraph("Attendees: Raushan Kumar, Test User."),
    heading(2, "Decisions"),
    bulletList([
      "Ship the MVP with edit-access sharing only",
      "Use PostgreSQL for persistence via Prisma",
    ]),
    paragraph("Follow-up scheduled for next week."),
  ],
};

const scratchpadDoc: Prisma.JsonObject = {
  type: "doc",
  content: [
    heading(1, "Untitled Scratchpad"),
    paragraph("Just some quick notes to self — nothing shared here."),
  ],
};

async function main() {
  const [raushan, testUser] = await Promise.all(
    SEED_USERS.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name },
        create: user,
      }),
    ),
  );

  const roadmap = await prisma.document.upsert({
    where: { id: "seed-roadmap-doc" },
    update: { title: "Q3 Product Roadmap", content: roadmapDoc },
    create: {
      id: "seed-roadmap-doc",
      title: "Q3 Product Roadmap",
      content: roadmapDoc,
      ownerId: raushan.id,
    },
  });

  await prisma.document.upsert({
    where: { id: "seed-kickoff-doc" },
    update: { title: "Kickoff Meeting Notes", content: kickoffDoc },
    create: {
      id: "seed-kickoff-doc",
      title: "Kickoff Meeting Notes",
      content: kickoffDoc,
      ownerId: testUser.id,
    },
  });

  await prisma.document.upsert({
    where: { id: "seed-scratchpad-doc" },
    update: { title: "Untitled Scratchpad", content: scratchpadDoc },
    create: {
      id: "seed-scratchpad-doc",
      title: "Untitled Scratchpad",
      content: scratchpadDoc,
      ownerId: raushan.id,
    },
  });

  // Raushan shares the roadmap with Test User (edit access).
  await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: roadmap.id, userId: testUser.id } },
    update: { permission: "EDIT" },
    create: {
      documentId: roadmap.id,
      userId: testUser.id,
      permission: "EDIT",
    },
  });

  console.log(`Seeded ${SEED_USERS.length} users, 3 documents, 1 share.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
