# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Heads-up:** Next.js 16 + React 19 with the React Compiler are in use here. APIs, file conventions, and middleware semantics differ from older training data — when in doubt, consult `node_modules/next/dist/docs/` rather than relying on memory.

## Commands

```bash
npm run dev          # start dev server (Turbopack)
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # vitest run (all tests)
npm run test:watch   # vitest interactive watch
npm run smoke:ai     # real network ping of the AI gateway (needs .env.local)
```

Run a single test file: `npx vitest run src/lib/parser/__tests__/parseCsv.test.ts`

## Mutation-verify discipline

When mutation-verifying a test:

1. State the mutation before applying it.
2. Apply the mutation.
3. Run the test. Confirm red.
4. REVERT immediately. Run the test. Confirm green.
5. Report all four steps in the verification log, in order.

If a mutation drill cannot be reverted cleanly (e.g., requires a git stash that another change overwrote), STOP and report. Do not continue. The integrity of the codebase outranks completing the drill.

Final commit MUST contain the unmutated code. If a mutation is in the final diff, the drill was not completed.

## Mutation-verify rigor

Three tickets (LOUPE-11, LOUPE-12, LOUPE-13) have shipped with mutation-verify
comments that referenced abstract mutations not actually executed against the
test's specific regex/threshold. Each was caught by /code-reviewer post-hoc as
a "test passes but doesn't prove the property" bug.

Rule: every MUTATION-VERIFY comment in a test must include:

1. The EXACT code change being mutated (file path + line + literal diff,
   not "add a field"), AND
2. The EXACT test name that goes red, AND
3. A 1-line manual verification ("Verified manually: YYYY-MM-DD. REVERTED.")

A comment that says "would red privacy test" is rejected. Either run the
mutation and document the actual result, or remove the comment.

When in doubt: write the test to assert against the SERIALIZED OUTPUT
(JSON.stringify) with a substring-match regex, not a quoted-field regex.
KM's `/patientId/i` pattern is the reference; LOUPE-13 Fix 1 standardizes on it.

## Architecture

**Loupe** is a medical/scientific data-visualization wizard. Users upload a dataset, map columns to typed roles, get a chart recommendation (AI or manual), and export a reproducible chart with a provenance receipt.

### Multi-step wizard flow

```
/upload  →  /upload/map  →  /recommend/choose  →  /recommend (AI) or /recommend/manual  →  /export
```

Global wizard state (intent, dataset, column mapping, chart slug, chart spec, selection mode, receipt) lives in `AppStateProvider` (`src/app/providers.tsx`), persisted to `sessionStorage`. All reads and writes go through this context — never reach into sessionStorage directly.

On hydration, `AppStateProvider` validates each stored value against its Zod schema and silently drops malformed entries. Components that depend on wizard state should gate on `hydrated === true` before rendering to avoid stale-state flicker.

Switching `selectionMode` (AI ↔ manual) resets `chartSlug` and `chartSpec` but intentionally preserves `mapping` and `intent`, so users can round-trip without redoing their column mapping.

### Auth

Supabase SSR via `@supabase/ssr`. The actual Next.js middleware lives at `src/proxy.ts` (not `src/middleware.ts`). It handles auth session refresh, CSP header injection (production only), and delegates to `src/utils/supabase/middleware.ts` for route protection.

Protected prefixes: `/upload`, `/recommend`, `/export`, `/dashboard`, `/library`, `/project`, `/account`. Unauthenticated requests redirect to `/auth`; authenticated users at `/auth` redirect to `/dashboard`.

Server-side auth checks use `requireUser()` from `src/utils/supabase/server.ts`. Pages are thin — they call `requireUser()` and return the page component.

`src/instrumentation-client.ts` enables Vercel BotID bot protection on `POST /auth` and `POST /account`.

### AI integration

`src/lib/ai/client.ts` wraps the Vercel AI Gateway via `createGateway` from the `ai` package (AI SDK v6). The model defaults to `anthropic/claude-sonnet-4.6`. Required env var: `AI_GATEWAY_API_KEY`. Optional: `ANTHROPIC_MODEL`, `AI_GATEWAY_BASE_URL`.

Never import provider-specific packages like `@ai-sdk/anthropic` — all AI calls go through the gateway.

`src/lib/ai/recommendChart.ts` is a `"use server"` Server Action called directly from the `useRecommendation` hook (`src/components/pages/uploadMap/useRecommendation.ts`) on the client. It runs `generateObject` with a strict Zod output schema and returns a typed `RecommendResult` — either a `Receipt` + `chartType` on success, or an error code.

### Privacy invariant

Patient-level data must never reach the server. This is enforced at two layers:

1. **Parser**: `PrivateRows` is a branded type — raw data rows cannot leave `src/lib/parser/` without explicit `brandRows()`. Files >5 MB are offloaded to a WebWorker (`xlsx.worker.ts`).
2. **AI payload guard**: `payloadSchema` in `src/lib/ai/recommendChart.schemas.ts` uses a deep `superRefine` that rejects any payload containing keys named `rows`, `data`, `values`, `sample`, etc. A PHI column-name detector (`src/lib/ai/phi/detect.ts`) runs client-side before the payload is assembled; matched headers must be renamed before proceeding.

### Chart system

`ChartSlug` (`src/lib/chartSpec/types.ts`) is the wide union of all 25+ chart types. `SpecKind` is the 4-type V1 subset with full Spec + PlotData: `km` (Kaplan–Meier), `barError` (bar with error bars), `box` (box plot), `xy` (line/scatter). All other slugs have a preview React component but no ChartSpec or PlotData — they are UI-only placeholders.

- Types and discriminated unions: `src/lib/chartSpec/types.ts`
- Zod schemas: `src/lib/chartSpec/schemas.ts`
- Default spec factory: `src/lib/chartSpec/factory.ts`
- `PlotData` variants are always **aggregated** — per-patient rows are forbidden in rendering types

`Receipt` (`src/lib/chartSpec/types.ts`) is the reproducibility record bound to a chart. It carries `selectionMode` (`"ai"` | `"manual"`), intent, recommendation copy, alternatives, transformations, and statistical tests.

### Column roles

`src/lib/roles/` — typed roles (`time`, `event`, `group`, `outcome`, `predictor`, `x`, `y`, `id`, `ignore`) with compatibility rules per chart intent (`km`, `bar-error`, `box`, `xy`, `any`). `autoMapColumns` heuristically assigns roles based on column names and inferred types.

### Component organization

- `src/app/<route>/page.tsx` — thin: auth guard + component import only
- `src/components/pages/<feature>/` — page-level logic and subcomponents
- `src/components/charts/` — one file per chart type; `chartPreviews.ts` maps slugs to metadata
- `src/components/chrome/` — `TopNav`, `Footer`, `AccountMenu`
- `src/components/primitives/` — `Eyebrow`, `RingLoader`, `RingDivider`, `Wordmark`

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | |
| `NEXT_PUBLIC_SITE_URL` | No | Normalized to origin |
| `AI_GATEWAY_API_KEY` | Yes (AI features) | |
| `ANTHROPIC_MODEL` | No | Defaults to `anthropic/claude-sonnet-4.6` |
| `AI_GATEWAY_BASE_URL` | No | Overrides gateway base URL |

`src/lib/env.ts` exports the public vars via literal property access — dynamic access (`process.env[key]`) breaks client-side bundling.

### Testing

For statistical primitives, anchor values in tests MUST be derived from an external source (R, scipy, hand-computation against a textbook formula) and the derivation MUST appear in a comment block above the assertion. A test whose expected value was generated by running the code under test does not prove the code is correct — it proves the code is consistent.

Vitest + `@testing-library/react` + happy-dom. Tests live in `__tests__/` subfolders next to the code they test. The vitest config aliases `@` → `src/`.
