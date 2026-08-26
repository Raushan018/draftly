# Draftly

## Overview

Draftly is a collaborative rich-text document editor built as a take-home assessment. Users can create, edit, search, import, and share documents with each other, with per-document owner/viewer/editor permissions backed by a real PostgreSQL database.

Multi-user behavior is demonstrated through a **seeded-user switcher** rather than real authentication — see [Authentication](#authentication-simulated) below for exactly what that does and doesn't mean.

## Features

- **Document CRUD** — create, rename, and edit rich-text documents (Tiptap-based editor with bold/italic, headings, and lists).
- **Autosave editing** — document content is persisted via a server action as you edit.
- **My Documents / Shared With Me** — separate views for documents you own vs. documents shared with you.
- **Search** — filter documents by title within either view.
- **Sharing with permissions** — owners can share a document with the other seeded user as `VIEW` (read-only) or `EDIT` (can edit content/title), and revoke access at any time. Access is enforced server-side on every read and write.
- **File import** — upload a `.txt` or `.md` file and it's converted into a new Tiptap document (see [Supported File Types](#supported-file-types)).
- **User switching** — a sidebar dropdown to switch between the two seeded users, so ownership/sharing can be exercised without logging in and out of a real auth system.

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router, Server Actions) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Tiptap](https://tiptap.dev/) (rich text editor)
- [Prisma ORM](https://www.prisma.io/) + PostgreSQL
- [Zod](https://zod.dev/) for input validation
- [Vitest](https://vitest.dev/) for testing

## Architecture

```
app/                       Next.js App Router pages
  (app)/documents/         "My Documents", "Shared With Me", and single-document views
actions/                   Server Actions (documents, sharing, upload, session)
components/                Client/server React components (editor, document list, sharing UI)
lib/                       Data access (Prisma queries), auth/session, validation, markdown import
prisma/                    Schema, migrations, seed script
tests/                     Vitest unit + integration tests
```

- **Data access** goes through `lib/documents.ts`, which centralizes the Prisma queries and the `resolveAccess()` permission check (owner vs. shared `VIEW`/`EDIT`).
- **Server Actions** in `actions/` are the only way the UI mutates data — each one re-derives the current user from the session cookie and re-checks permissions before touching the database, so there's no separate trust boundary to keep in sync.
- **Database**: three Prisma models — `User`, `Document`, and `DocumentShare` (a join table with a `permission` enum, unique per `documentId` + `userId`).

## Local Setup

**Prerequisites:** Node.js 20+, a PostgreSQL database (local or hosted, e.g. [Neon](https://neon.tech/)).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and fill in your connection strings (see below):
   ```bash
   cp .env.example .env
   ```
3. Apply the schema and seed demo data:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Defined in `.env.example`:

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | App runtime (`lib/prisma.ts`) | Your provider's **pooled** connection string |
| `DIRECT_URL` | Prisma CLI (`prisma.config.ts`) — migrate/seed/studio | The **direct (unpooled)** connection string |

## Database Setup

Schema lives in `prisma/schema.prisma` with migrations under `prisma/migrations/`.

| Command | Purpose |
|---|---|
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply existing migrations (production/CI) |
| `npm run db:seed` | Seed the two demo users and sample documents |
| `npm run db:studio` | Open Prisma Studio |

## Seed Users

`npm run db:seed` creates two users and three sample documents (one shared with `EDIT` access between them):

| Name | Email |
|---|---|
| Raushan Kumar | raushan@test.com |
| Test User | test@example.com |

## Running the Application

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run start    # run the production build
npm run lint     # ESLint
```

### Authentication (simulated) {#authentication-simulated}

**This project does not implement real authentication.** There is no login form, password, session token, or identity provider. Instead, it uses a lightweight **seeded-user switcher** so the sharing/authorization features can be demonstrated without the overhead of a full auth system:

- A dropdown in the sidebar (bottom-left) lets you switch between the two seeded users at any time.
- The "active" user is tracked by a plain cookie (`draftly_user_id`) holding that user's database ID — nothing more. Every request re-validates the cookie against the `User` table server-side and falls back to the first seeded user if the cookie is missing or invalid.
- Every document query, page load, and mutation re-derives the current user from this cookie on the server and re-checks ownership/share permissions accordingly — switching users immediately changes what you see and what you're allowed to do.

This is intentionally minimal and **not a pattern to reuse in a real product** — no passwords, no session expiry, no CSRF-specific hardening beyond what Next.js Server Actions already provide, and anyone can set the cookie to any valid user ID in this environment. It exists solely so a reviewer can demonstrate multi-user document sharing without standing up an identity provider.

## Supported File Types

The **Upload** action accepts:

- `.txt` — plain text, split into paragraphs on blank lines
- `.md` — a small custom Markdown subset: `#`/`##` headings, `-`/`*` bullet lists, `1.` ordered lists, and inline `**bold**`/`*italic*`/`_italic_`

Constraints: max file size **1MB**, file must not be empty. Both client-side (`components/layout/UploadDialog.tsx`) and server-side (`lib/validation.ts`) validation enforce the same rules. This is a hand-rolled converter (`lib/markdown-to-tiptap.ts`), not a full CommonMark parser — it does not support tables, code blocks, links, images, or nested lists.

## Testing

```bash
npm test
```

Runs two Vitest suites:

- **`tests/markdown-to-tiptap.test.ts`** — unit tests for the `.md`/`.txt` → Tiptap JSON converter. No database required.
- **`tests/sharing.test.ts`** — an integration test exercising the real `shareDocument`/`unshareDocument` server actions against a real Postgres database: owner sharing a document, recipient gaining access, an unrelated user being denied, duplicate shares collapsing into one row, a non-owner being rejected, and sharing with a nonexistent user being rejected.

The sharing suite needs a real database — it uses whatever `DATABASE_URL`/`DIRECT_URL` are configured in `.env` and pushes the current schema to it via a Vitest global setup step. **Point `.env` at a disposable/dev database before running tests, never production** — the suite creates and deletes real rows.

## Deployment

No deployment configuration is included as part of this assessment. To deploy, you would need to:

1. Provision a PostgreSQL database and set `DATABASE_URL`/`DIRECT_URL` on your host.
2. Run `npm run db:deploy` to apply migrations (and `npm run db:seed` if you want the demo users/documents).
3. Build and start with `npm run build && npm run start`, or deploy to a platform like Vercel with the same environment variables configured.

The simulated-auth cookie switcher would need to be replaced with real authentication before this could be exposed publicly.

## Assessment Scope

This project focuses on demonstrating:

- A working Next.js App Router + Server Actions + Prisma stack
- Correct, server-enforced authorization for document ownership and sharing (owner / editor / viewer)
- A functioning rich-text editor with persistence
- A minimal, real (not mocked) import pipeline for plain text and Markdown
- Test coverage for the trickiest logic (permission checks, markdown conversion)

It intentionally does not attempt production concerns like real auth, rate limiting, or multi-tenant isolation beyond what's described above.

## Known Limitations

- **No real authentication** — see [Authentication](#authentication-simulated).
- **No document version history** — edits overwrite the previous content; there's no undo-across-sessions or revision log.
- **No real-time collaboration** — two users editing the same document concurrently will overwrite each other's changes (last write wins); there's no operational transform / CRDT layer.
- **Markdown import is a small custom subset**, not a full CommonMark parser (no tables, code blocks, links, images, or nested lists).
- **Sharing is limited to the two seeded users** — there's no user invitation/search-by-email flow beyond the fixed seed data.
- **No file export** (PDF/Markdown/etc.) — content can only be viewed/edited in the app.

## Future Improvements

- Replace the seeded-user cookie with real authentication (e.g. an OAuth/email-based provider).
- Add document version history and/or autosave conflict detection.
- Real-time multiplayer editing (e.g. Yjs + Tiptap collaboration extension).
- Broaden Markdown import to a standard parser (tables, code blocks, links) and add file export.
- Invite-by-email sharing instead of a fixed two-user roster.
