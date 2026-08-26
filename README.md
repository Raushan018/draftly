# Draftly

A collaborative document editor: create, edit, and share rich-text documents, backed by PostgreSQL.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Tiptap (rich text editing)
- Prisma ORM + PostgreSQL

## Getting started

1. Copy `.env.example` to `.env` and fill in your PostgreSQL connection strings:
   - `DATABASE_URL` — pooled connection string, used by the app at runtime
   - `DIRECT_URL` — direct (unpooled) connection string, used only by Prisma CLI commands (migrate/seed)
2. Install dependencies:
   ```bash
   npm install
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

Open [http://localhost:3000](http://localhost:3000).

## Authentication (simulated — not production auth)

**This project does not implement real authentication.** There is no login form, password, session token, or identity provider. Instead, it uses a lightweight **seeded-user switcher** so the sharing/authorization features can be demonstrated without the overhead of a full auth system:

- Two users are seeded into the database:

  | Name | Email |
  |---|---|
  | Raushan Kumar | raushan@test.com |
  | Test User | test@example.com |

- A dropdown in the sidebar (bottom-left) lets you switch between these seeded users at any time.
- The currently "active" user is tracked by a plain cookie (`draftly_user_id`) holding that user's database ID — nothing more. Every request re-validates the cookie against the `User` table server-side and falls back to the first seeded user if the cookie is missing or invalid.
- Every document query, page load, and mutation (viewing "My Documents"/"Shared With Me", opening a document, editing content, renaming, sharing) re-derives the current user from this cookie on the server and re-checks ownership/share permissions accordingly — switching users immediately changes what you see and what you're allowed to do, because there is no separate cached identity anywhere.

This is intentionally minimal and is **not** a pattern to reuse in a real product — it has no passwords, no session expiry, no CSRF-specific hardening beyond what Next.js Server Actions already provide, and anyone can set the cookie to any valid user ID in this environment. It exists solely so an assessment reviewer (or anyone running the app locally) can demonstrate multi-user document sharing without standing up an identity provider.

## Testing

```bash
npm test
```

This runs two suites with Vitest:

- **`tests/markdown-to-tiptap.test.ts`** — pure unit tests for the `.md`/`.txt` → Tiptap JSON converter used by file import. No database required.
- **`tests/sharing.test.ts`** — an integration test exercising the real `shareDocument`/`unshareDocument` server actions (not a reimplementation of their logic) against a real Postgres database, covering: an owner sharing a document, the recipient gaining access, an unrelated user being denied access, duplicate shares collapsing into a single updated row instead of creating a second one, a non-owner being rejected when attempting to share, and sharing with a nonexistent user being rejected.

The sharing suite needs a real database — it uses whatever `DATABASE_URL`/`DIRECT_URL` are configured in `.env` (the same prerequisite as `npm run dev`), and pushes the current schema to it before running via a Vitest global setup step. **Point `.env` at a disposable/dev database before running tests, never production** — the suite creates and deletes real rows.

## Database scripts

| Command | Purpose |
|---|---|
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply existing migrations (production/CI) |
| `npm run db:seed` | Seed the two demo users and sample documents |
| `npm run db:studio` | Open Prisma Studio |
