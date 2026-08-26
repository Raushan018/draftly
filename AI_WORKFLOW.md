# AI Workflow

https://youtu.be/YCHUeQDStGE
video link https://youtu.be/YCHUeQDStGE

Honest account of how AI assistance was used to build Draftly, and how everything it produced was verified. This is not a marketing document — it names specific places AI helped, specific places its first pass was wrong or overbuilt, and how correctness was actually checked before anything was accepted.

## AI Tools Used

**Claude Code** (Anthropic's CLI agent, Sonnet models) was the only AI tool used, for both implementation and this documentation set. There was no use of a second code-completion tool (e.g. Copilot) alongside it, and no AI-generated design assets, copy, or data. The repository's `AGENTS.md`/`CLAUDE.md` files are Claude Code's own framework-detection notes, not hand-authored project docs.

AI was used as a **pair-programming assistant driven by explicit, scoped instructions** — "add X constraint," "write an integration test for sharing," "explain this tradeoff" — not as an autonomous agent left to design the product unsupervised. Every meaningful architectural choice (flat owner/editor/viewer model, no real-time collaboration, cookie-based simulated auth, whole-document autosave) was a decision made by weighing options, not a default the AI happened to pick.

## Architecture Exploration

Before writing code for a given piece (sharing, upload, autosave), the AI was asked to lay out options and tradeoffs rather than jump straight to an implementation — e.g. "CRDT-based collaboration vs. autosave with last-write-wins" or "custom Markdown parser vs. a CommonMark library." In both of those cases the simpler option was chosen deliberately for the reasons documented in [ARCHITECTURE.md §12](ARCHITECTURE.md#12-important-tradeoffs) — scope discipline, not AI preference. This is where AI accelerated things most: getting a structured comparison of two or three real approaches in a couple of minutes instead of spending that time researching them from scratch.

## Code Generation

Most of `actions/`, `lib/`, and the React components were scaffolded by AI from specific instructions, then read and adjusted line by line — not accepted wholesale. Examples of what shipped versus what was changed:

- **Accepted with review, not modified**: the `DocumentShare` upsert keyed on `(documentId, userId)` in `actions/sharing.ts`. This was the AI's first suggestion for "sharing the same user twice shouldn't create two rows," it was correct on inspection (the unique constraint makes it atomic, not just app-level dedup), and it's exactly what `tests/sharing.test.ts` (test 5) verifies.
- **Modified after review**: the initial draft of `lib/errors.ts` returned Prisma's raw error message to the client in the fallback case. That was flagged during review as a potential internal-detail leak (query/table names in error text) and changed to the current version — a fixed set of known Prisma error codes mapped to safe strings, with the real error only ever going to `console.error` server-side.
- **Rejected outright**: an early version of the Markdown importer used a regex-heavy single-pass approach to handle headings, lists, and inline formatting all at once. It was hard to reason about and got list/paragraph boundaries wrong on edge cases (e.g. a list immediately followed by a paragraph with no blank line). It was thrown away in favor of the current line-by-line block scanner (`parseMarkdownBlocks` in `lib/markdown-to-tiptap.ts`) with a separate, simpler inline-mark pass — less clever, easier to verify by reading it, and easier to unit test exhaustively.
- **Simplified after review**: an early pass at the autosave status UI proposed a generic toast/notification system for save errors. That was cut down to the current inline `SaveIndicator` (`Saved` / `Saving…` / `Error saving · Retry`) in `DocumentEditor.tsx` — a toast system was more infrastructure than a single save-status affordance warranted.

## Debugging

AI was used to narrow down failures (failing test output, TypeScript errors, Prisma migration errors) by pasting the actual error and relevant code, not by describing the symptom from memory. Two examples of substance:

- The `prisma.config.ts` split between `DATABASE_URL` (pooled) and `DIRECT_URL` (unpooled) exists because migrations against a pooled connection failed on advisory locks — a real error encountered while running `prisma migrate dev` against a pooled connection string, not a preemptive best-practice applied blindly.
- Getting `tests/sharing.test.ts` to run at all required figuring out that `getCurrentUser()` calls `cookies()` from `next/headers`, which throws outside a real Next.js request context. The fix (mocking `next/headers` and `next/cache` at the module boundary, documented inline in the test file) came from diagnosing that specific runtime error, not from writing the mock speculatively up front.

In both cases, the AI proposed a fix; it was verified by re-running the failing command and confirming the actual error was gone, not by trusting the explanation.

## Testing Assistance

AI drafted the initial structure of both Vitest suites (`tests/markdown-to-tiptap.test.ts`, `tests/sharing.test.ts`) from a description of what needed coverage. The **choice of what to test** was directed explicitly, not left to the AI: the sharing suite was scoped to hit the real exported Server Actions against a real database specifically because a mocked-ORM version would validate the mock's behavior, not the actual authorization logic — that instruction shaped the "no reimplementation, only the real code path" comment sitting in the test file today. Every generated test was run and its assertions checked against expected before being kept; a couple of initially-proposed assertions that were checking implementation details (e.g. asserting on the shape of a Prisma error object rather than the action's returned `ok`/`error` result) were rewritten to assert on the actual contract instead.

## Documentation Assistance

`README.md`, `ARCHITECTURE.md`, and this file were AI-drafted from the actual codebase — read first, not written from a description of what the app "should" do — then reviewed for accuracy against the code (schema, validation rules, seed data, test coverage) before being accepted. Where the first draft would have overstated something (e.g. an early pass described the Markdown import as "Markdown support" without qualifying it as a small custom subset), it was corrected to name the actual limitation explicitly, per [README.md § Known Limitations](README.md#known-limitations).

## Where AI Materially Accelerated Development

Being specific about this rather than vague:

- **Boilerplate-heavy, low-risk surface area** — Server Action scaffolding, Zod schemas, Tailwind markup for dialogs/forms — where the pattern was already decided and typing it out by hand would have been pure time cost.
- **First-pass structured comparisons** for architecture decisions (see [Architecture Exploration](#architecture-exploration)), turning "what are my options here" into a few minutes instead of independent research.
- **Writing the integration test's supporting scaffolding** (seeding/cleanup of throwaway users and a document per test run, mocking `next/headers`/`next/cache`) — mechanical but easy to get subtly wrong by hand.
- **Documentation authored directly from source** — because the AI could read the actual schema/actions/tests in the same pass it wrote the docs, the first draft was already close to accurate, cutting review-and-rewrite cycles compared to writing docs from a verbal description.

It did **not** materially speed up the actual authorization design (owner/editor/viewer model, what gets re-checked where) — that required deliberate human decisions about what guarantee each check needed to provide, which AI can implement quickly once decided but doesn't reliably decide correctly on its own.

## How Correctness Was Verified

Nothing AI-generated was taken on trust. Verification methods, concretely:

- **Manual testing** — every feature (create, edit with autosave, rename, share/unshare with both permission levels, switch users, upload `.txt`/`.md`, search) was exercised by hand in the browser across both seeded users, including the negative cases (a viewer trying to edit, an unshared user hitting a document URL directly).
- **Automated tests** — `npm test` (Vitest) run locally after every meaningful change to `actions/sharing.ts`, `lib/documents.ts`, or `lib/markdown-to-tiptap.ts`, not just once at the end. The sharing suite in particular was used as the actual arbiter for whether an authorization change was correct, since it exercises the real Server Actions against a real database.
- **Database verification** — `npm run db:studio` (Prisma Studio) used directly to inspect `DocumentShare` rows after share/unshare operations — confirming the upsert behavior (one row, permission updated) and cascade deletes, rather than trusting the query result alone.
- **Production build** — `npm run build` run to catch type errors, server/client boundary violations, and other issues that `next dev` doesn't always surface, before considering any milestone done.
- **Deployment testing** — `npm run build && npm run start` run locally against a real (non-production) Postgres database to confirm the app behaves the same way outside the dev server — no dev-only behavior silently relied upon.
- **UX review** — manual pass focused on the states AI-generated UI code most often gets wrong: empty states (no documents, no search results), loading/pending states (editor skeleton before Tiptap mounts, saving indicator, share-dialog pending state), and error states (failed save with retry, invalid file upload, sharing rejected).

The combination matters: automated tests catch regressions in logic that's easy to verify by assertion (permission resolution, markdown conversion); manual testing and database inspection catch the things tests don't — actual UI behavior, real database state, and edge cases that weren't anticipated when the tests were written.
