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

## Architecture

**Loupe** is a medical/scientific data-visualization wizard. Users upload a dataset, map columns to typed roles, get a chart recommendation (AI or manual), and export a reproducible chart with a provenance receipt.

### Multi-step wizard flow

```
/upload  →  /upload/map  →  /recommend (AI) or /recommend/manual  →  /recommend/choose  →  /export
```

Global wizard state (intent, dataset, column mapping, chart slug, chart spec, selection mode) lives in `AppStateProvider` (`src/app/providers.tsx`), persisted to `sessionStorage`. All reads and writes go through this context — never reach into sessionStorage directly.

### Auth

Supabase SSR via `@supabase/ssr`. Middleware at `src/utils/supabase/middleware.ts` protects these prefixes: `/upload`, `/recommend`, `/export`, `/dashboard`, `/library`, `/project`, `/account`. Unauthenticated requests redirect to `/auth`; authenticated users at `/auth` redirect to `/dashboard`.

Server-side auth checks use `requireUser()` from `src/utils/supabase/server.ts`. Pages are thin — they call `requireUser()` and return the page component.

### AI integration

`src/lib/ai/client.ts` wraps the Vercel AI Gateway via `createGateway` from the `ai` package (AI SDK v6). The model defaults to `anthropic/claude-sonnet-4.6`. Required env var: `AI_GATEWAY_API_KEY`. Optional: `ANTHROPIC_MODEL`, `AI_GATEWAY_BASE_URL`.

Never import provider-specific packages like `@ai-sdk/anthropic` — all AI calls go through the gateway.

### Chart system

**V1 has 4 full-spec chart types**: `km` (Kaplan–Meier), `barError` (bar with error bars), `box` (box plot), `xy` (line/scatter). Every other `ChartSlug` is a preview-only type.

- Types and discriminated unions: `src/lib/chartSpec/types.ts`
- Zod schemas: `src/lib/chartSpec/schemas.ts`
- Default spec factory: `src/lib/chartSpec/factory.ts`
- `PlotData` variants are always **aggregated** — per-patient rows are forbidden in rendering types

`Receipt` (`src/lib/chartSpec/types.ts`) is the reproducibility record bound to a chart. It carries `selectionMode` (`"ai"` | `"manual"`), intent, recommendation copy, alternatives, transformations, and statistical tests.

### Column roles

`src/lib/roles/` — typed roles (`time`, `event`, `group`, `outcome`, `predictor`, `x`, `y`, `id`, `ignore`) with compatibility rules per chart intent (`km`, `bar-error`, `box`, `xy`, `any`). `autoMapColumns` heuristically assigns roles based on column names and inferred types.

### File parser

`src/lib/parser/` — parses CSV (PapaParse) and XLSX (xlsx library). Files >5 MB are offloaded to a WebWorker (`xlsx.worker.ts`). Multi-sheet XLSX triggers a sheet-selection UI before parsing.

`PrivateRows` is a branded type — raw data rows cannot escape the parser without explicit `brandRows()`. This enforces the privacy invariant that patient-level data stays client-side and never reaches the server.

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

Vitest + `@testing-library/react` + happy-dom. Tests live in `__tests__/` subfolders next to the code they test. The vitest config aliases `@` → `src/`.

