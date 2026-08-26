# Architecture

https://youtu.be/YCHUeQDStGE
video link https://youtu.be/YCHUeQDStGE

Technical companion to [README.md](README.md). Explains the *why* behind the structure, not just the *what*.

## 1. Product Approach

The brief behind this assessment is a collaborative document editor with sharing. The highest-value thing to prove in a time-boxed assessment is **correct, server-enforced authorization across multiple users** — not editor polish or infrastructure breadth. So the scope was deliberately narrowed to:

- One editor, one document model, one permission model (owner / editor / viewer).
- A minimal but real multi-user mechanism (see [§9](#9-simulated-authentication)) so sharing can actually be exercised end-to-end, not just unit-tested in isolation.
- A real import pipeline instead of a stub, because it exercises the same write path (create + persist a Tiptap document) through a different entry point.

Everything in [§12](#12-important-tradeoffs) is a feature that was deliberately left out to protect that scope, not an oversight.

## 2. Architecture

Draftly is a single Next.js (App Router) application — no separate API server. Server Actions are the entire backend surface:

```
Browser (Client Components)
   │  calls Server Actions directly (no hand-rolled REST/JSON API)
   ▼
actions/*.ts  ── "use server"
   │  1. validate input (Zod)
   │  2. resolve current user from cookie (lib/session.ts)
   │  3. re-check ownership/permission (lib/documents.ts)
   ▼
lib/*.ts  ── Prisma queries, access resolution, converters
   ▼
PostgreSQL (via @prisma/adapter-pg)
```

Server Components fetch data directly (via `lib/documents.ts`) for the initial page render; Client Components then call Server Actions for mutations. There's no client-side data-fetching library (SWR/React Query) — pages are re-rendered via `revalidatePath()` after a mutation, which fits the App Router's server-first model and avoids maintaining a duplicate client cache.

## 3. Frontend

- **App Router**, React Server Components by default; `"use client"` only where interactivity is needed (editor, dialogs, search form, upload form, user switcher).
- **Tiptap** (`@tiptap/react` + `starter-kit`) for the rich-text editor — chosen because it's a thin, headless wrapper over ProseMirror that stores content as JSON, which maps directly onto a Prisma `Json` column with no serialization layer to design.
- **Tailwind CSS** for styling; no component library, since the assessment doesn't call for a broad design system.
- State is intentionally local: editor content lives in the Tiptap instance, save status is a small local state machine (`saved` / `saving` / `error`) in `DocumentEditor.tsx`, and there is no global client store.

## 4. Backend

There is no separate backend process. "Backend" is `actions/*.ts` (Server Actions) plus `lib/*.ts` (shared logic they call):

- `actions/documents.ts` — create, rename, update content.
- `actions/sharing.ts` — share/unshare, always re-checking the caller is the owner.
- `actions/upload.ts` — validate + convert an uploaded file into a new document.
- `actions/session.ts` — switch the active seeded user.

Every action independently re-derives the current user and re-checks permissions (see `lib/documents.ts#resolveAccess`) rather than trusting anything passed from the client. This means there's no separate "auth middleware" layer to keep in sync with the actions — the check lives right next to the write it guards.

Errors from Prisma are translated to safe, generic messages via `lib/errors.ts#toFriendlyError` (e.g. a unique-constraint violation becomes "That already exists.") so raw driver/SQL text never reaches the client.

## 5. Database

PostgreSQL via Prisma, accessed through `@prisma/adapter-pg` (the driver adapter, not Prisma's bundled query engine binary). Three models (`prisma/schema.prisma`):

- **`User`** — `id`, `name`, `email` (unique). No password/credential fields at all — there is nothing to hash or verify, by design (see [§9](#9-simulated-authentication)).
- **`Document`** — `title`, `content` (`Json`), `ownerId`. Indexed on `ownerId` for the "My Documents" query.
- **`DocumentShare`** — join table between `Document` and `User` with a `permission` enum (`VIEW` | `EDIT`), unique on `(documentId, userId)`. That uniqueness constraint is what makes sharing idempotent (see [§8](#8-sharing-and-authorization)).

Two connection strings are used for one reason: connection pooling. `DATABASE_URL` (pooled, e.g. via PgBouncer/Neon's pooler) is what the running app uses for normal request traffic; `DIRECT_URL` (unpooled) is what the Prisma CLI uses for migrations, because schema changes need session-level features (advisory locks) that poolers don't reliably support.

## 6. Document Persistence

A document's `content` column stores a Tiptap/ProseMirror JSON document (`{ type: "doc", content: [...] }`) verbatim — there's no separate rich-text-to-storage transformation. This keeps the read path trivial (fetch the row, hand the JSON straight to `useEditor({ content })`) at the cost of coupling the stored shape to the current editor's schema (see [§12](#12-important-tradeoffs)).

**Autosave**, not save-on-submit: `DocumentEditor.tsx` debounces `onUpdate` by 800ms and calls the `updateDocumentContent` Server Action with the full JSON document. There's no diffing — every autosave writes the entire content column. A visible status indicator (`Saved` / `Saving…` / `Error saving · Retry`) tracks the last attempt, and a failed save is retried manually rather than silently retried, so a persistent failure is never hidden from the user.

## 7. File Import

`actions/upload.ts` accepts a single `.txt` or `.md` file (≤1MB, validated identically on the client in `UploadDialog.tsx` and on the server via the same `lib/validation.ts` Zod schema — the client check is for UX responsiveness only, the server check is the actual guarantee). The file is converted to a Tiptap document by a small hand-rolled parser (`lib/markdown-to-tiptap.ts`):

- `.md` → headings (`#`/`##`), bullet/ordered lists, `**bold**`/`*italic*`/`_italic_`, paragraphs.
- `.txt` → paragraphs split on blank lines.

This was written as a minimal recursive-descent line scanner rather than pulling in a full CommonMark library (e.g. `remark`), because the goal was to prove the import→document pipeline works end-to-end, not to ship complete Markdown support — see [§12](#12-important-tradeoffs) for what that trades away.

## 8. Sharing and Authorization

Permission model is intentionally flat: a document has exactly one owner and zero or more shares, each with `VIEW` or `EDIT`. `lib/documents.ts#resolveAccess(doc, userId)` is the single function that turns "this document" + "this user" into `{ canView, canEdit, isOwner }`, and it's called from every read and write path that touches document content — there's no second copy of this logic anywhere (e.g. in middleware or in the UI).

Key properties, enforced server-side, not just hidden in the UI:

- Only the owner can call `shareDocument`/`unshareDocument` (`assertOwner()` check, re-run inside the action itself, not trusted from a prop).
- Sharing the same user twice **upserts** on the `(documentId, userId)` unique constraint instead of creating duplicate rows — this is a database-level guarantee, not just application logic, so it holds even under concurrent requests.
- A `VIEW` share renders the editor read-only (`canEdit` gates both the Tiptap `editable` flag and whether the toolbar/rename control is shown); a non-shared, non-owning user gets no access at all, enforced before the document is even fetched for render.

This is covered by an integration test against a real database rather than a unit test with a mocked ORM — see [§10](#10-testing).

## 9. Simulated Authentication

**There is no real authentication.** No password, no session token, no identity provider, no JWT. Instead:

- Two users are seeded at setup time.
- A plain cookie (`draftly_user_id`) holds the "active" user's database ID. `lib/session.ts#getCurrentUser()` reads it, re-validates it against the `User` table on every request, and falls back to the first seeded user if it's missing or stale.
- A sidebar dropdown (`UserSwitcher.tsx`) lets you flip the cookie between the two seeded users via a Server Action (`actions/session.ts`), so you can immediately see how "My Documents", "Shared With Me", and permission-gated editing change per user.

This is a deliberate, explicit shortcut, not an attempt at real auth: anyone can set the cookie to any valid user ID; there's no password to prove identity, no session expiry, and no CSRF hardening beyond what Next.js Server Actions provide by default. It exists purely so a reviewer can exercise multi-user sharing locally in minutes instead of standing up an identity provider. See [§12](#12-important-tradeoffs) for why enterprise auth was out of scope.

## 10. Testing

Vitest, two suites, deliberately different in kind:

- **`tests/markdown-to-tiptap.test.ts`** — pure unit tests, no I/O, for the import converter.
- **`tests/sharing.test.ts`** — an **integration** test against a real Postgres database (schema pushed via a Vitest global-setup step, `tests/setup/global-setup.ts`). It calls the actual exported `shareDocument`/`unshareDocument` Server Actions and `resolveAccess()` — not reimplementations of their logic — with `next/headers` and `next/cache` mocked only at the framework boundary (cookie access, `revalidatePath`), so the authorization logic under test is the real code path a request would hit.

Authorization was chosen as the thing to integration-test (rather than mock-and-unit-test) because it's the part of the system where a passing mock and a broken reality are most likely to diverge — permission bugs are exactly the kind of thing that "the mock said yes" can hide.

## 11. Deployment

No deployment target is configured as part of this assessment — see [README.md § Deployment](README.md#deployment) for the steps required (provision Postgres, set `DATABASE_URL`/`DIRECT_URL`, `db:deploy`, `build && start`). Deploying this as-is would still be gated on replacing [§9](#9-simulated-authentication) with real authentication before it's exposed to anyone but the reviewer.

## 12. Important Tradeoffs

- **Whole-document autosave, no diffing/CRDT.** Simple and correct for a single editor at a time; means concurrent edits by two users are last-write-wins with no merge. Acceptable because concurrent same-document editing isn't the thing being demonstrated.
- **Storage format is coupled to the editor.** Storing raw Tiptap JSON makes reads trivial but means the stored shape isn't a stable, editor-agnostic document format — a schema/editor change would need a migration for existing content. Traded for implementation speed.
- **Custom Markdown parser instead of a full CommonMark library.** Enough to prove the import pipeline end-to-end (headings, lists, bold/italic, paragraphs); doesn't support tables, code blocks, links, images, or nested lists. A real dependency would be a five-minute swap if broader Markdown support were needed.
- **Fixed two-user roster instead of invite-by-email.** Keeps the sharing UI and seed data trivial; the tradeoff is that `ShareDialog` only ever lists "the other seeded user," not an arbitrary org directory.

### Why real-time collaboration was deprioritized

Real-time multiplayer editing (e.g. Yjs/CRDT + Tiptap's collaboration extension) is a substantial, separable piece of infrastructure — it needs a sync backend (websocket server or a hosted provider), awareness/presence state, and conflict-resolution logic that has nothing to do with the authorization model this assessment is meant to demonstrate. Building it well would have consumed most of the available time on infrastructure orthogonal to the core ask, at high risk of a shallow, buggy implementation. Autosave with last-write-wins was the correct-for-scope alternative: it's simple, it's correct for a single active editor, and it doesn't pretend to solve concurrent editing while actually leaving data-loss edge cases in place.

### Why comments were deprioritized

Comments (threaded, anchored to a text range) require anchor-position tracking that survives concurrent edits — normally solved with the same CRDT/OT machinery as real-time collaboration, or accepted as fragile without it. Without real-time editing in scope, comments would either need to be scoped down to whole-document notes (low value, doesn't demonstrate anything sharing/auth doesn't already) or built on top of unstable anchors (misleading — comments would silently drift from the text they reference). Neither was worth the schema/UI surface area relative to strengthening sharing and authorization.

### Why version history was deprioritized

Version history needs a storage strategy (snapshot every save vs. diff-based) and a retention/restore UX, and — done honestly — data-integrity guarantees about what state a restore leaves shares and permissions in. It's a well-understood feature with no interesting interaction with the assessment's core focus (authorization), so it was cut in favor of spending that time on the sharing test suite and access-control correctness instead. The absence is explicit: overwriting `content` on every save is documented as a known limitation, not hidden.

### Why enterprise authentication was deprioritized

Real authentication (password hashing, session/JWT management, OAuth/SSO, CSRF tokens, rate limiting on auth endpoints) is a well-solved problem with mature libraries (NextAuth/Auth.js, Clerk, etc.) — implementing it from scratch would mostly demonstrate familiarity with security boilerplate rather than the system-design and authorization work the assessment is actually evaluating. The seeded-user cookie switcher was chosen instead because it lets a reviewer exercise real multi-user, multi-permission behavior in under a minute, with the tradeoff — no real identity guarantee — stated plainly rather than glossed over. Swapping in a real auth provider would touch exactly one seam (`lib/session.ts#getCurrentUser()`); every downstream authorization check in [§8](#8-sharing-and-authorization) is already written against "a resolved user ID," not against the cookie mechanism itself.
