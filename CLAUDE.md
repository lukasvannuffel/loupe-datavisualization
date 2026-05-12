# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Heads-up:** Next.js 16 + React 19 with the React Compiler are in use here. APIs, file conventions, and middleware semantics differ from older training data — when in doubt, consult `node_modules/next/dist/docs/` rather than relying on memory.

## Commands

```bash
npm run dev          # Next dev server (Turbopack, root pinned in next.config.ts)
npm run build        # Production build
npm run start        # Serve the production build
npm run lint         # ESLint (flat config, eslint.config.mjs)
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (single run, node env)
npm run test:watch   # Vitest watch mode

# Single test file / pattern:
npx vitest run src/lib/chartSpec/__tests__/chartSpec.test.ts
npx vitest run -t "kmSpec"
```

Vitest only collects `src/**/__tests__/**/*.test.ts` (see `vitest.config.ts`). The `@/*` import alias resolves to `src/*` in both `tsconfig.json` and the Vitest resolver.

## Required environment

`src/lib/env.ts` validates these at module load and throws if missing — code that imports `@/lib/env` will fail to start until they are set:

- `NEXT_PUBLIC_SUPABASE_URL` (required)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (required)
- `NEXT_PUBLIC_SITE_URL` (optional; used to build the auth-callback redirect — without it, signup confirmation emails fall back to Supabase defaults)

Public env vars are accessed via literal `process.env.NEXT_PUBLIC_*` reads so Next can statically inline them into the client bundle. **Do not switch to dynamic access (`process.env[key]`)** — it breaks browser builds.

## Architecture

### Request pipeline: `src/proxy.ts` (Next 16 proxy, formerly middleware)

Every non-static request flows through `src/proxy.ts`:

1. `buildSecurityHeaders()` (`src/lib/security-headers.ts`) generates a per-request CSP nonce and a strict CSP allowing only `'self'`, the Supabase origin (HTTPS + WSS), and nonce-tagged scripts/styles. The nonce is forwarded on the **request** headers as `x-nonce` so server-rendered components can opt in.
2. `updateSession()` (`src/utils/supabase/middleware.ts`) creates a Supabase server client bound to the request/response cookies, calls `getUser()`, and:
   - redirects unauthenticated users on `PROTECTED_PREFIXES` (`/upload`, `/recommend`, `/export`, `/dashboard`, `/library`, `/project`, `/account`) to `/auth`, and
   - redirects authenticated users away from `/auth` to `/dashboard`.
   - **Do not insert code between `createServerClient(...)` and `supabase.auth.getUser()`** — the `setAll` callback is what refreshes the auth cookies on the outgoing response.
3. The CSP header is then set on the response.

The matcher excludes `_next/static`, `_next/image`, common image/font extensions, and the Vercel BotID challenge proxy path (`149e9513-…`). If you add a new BotID-protected route, register it in `src/instrumentation-client.ts`.

### Authentication: three Supabase clients, never share

- `src/utils/supabase/client.ts` — browser (`createBrowserClient`). Use in client components.
- `src/utils/supabase/server.ts` — server components, server actions, route handlers. Exposes `requireUser()` which redirects to `/auth` if there is no session.
- `src/utils/supabase/middleware.ts` — proxy-only client that mutates the outgoing response cookies.
- `src/utils/supabase/cookies.ts` — `hardenSupabaseCookieOptions()` forces `httpOnly`, `sameSite=lax`, `secure` (prod), `path=/` on every `sb-*` cookie. Both the server and proxy clients run all writes through it.

Server actions that mutate auth state (`src/app/auth/actions.ts`, `src/app/account/actions.ts`) gate themselves on `verifyHuman()` from `src/utils/bot-guard.ts` (Vercel BotID; **fails open** on infra errors so legitimate users aren't locked out). Signup errors are collapsed into a single generic message to prevent email enumeration — preserve that pattern when touching auth flows.

### App state

`src/app/providers.tsx` defines the only global client store: `AppStateProvider` holds the user's intent (persisted to `sessionStorage` under `loupe.intent`), the column-role mapping, and the chosen `ChartSlug`. There is no Redux/Zustand — all cross-page state is here.

### Chart domain: `src/lib/chartSpec/`

This is the load-bearing model of the product. **Read it before changing anything related to charts, exports, or persistence.**

- `types.ts` — TypeScript types for `ChartSpec` (the discriminated union of `KMSpec | BarErrorSpec | BoxSpec | XYSpec` — V1 ships with these four), `PlotData` (the matching aggregated input data), `Receipt` (reproducibility record), and `ChartSlug` (the full slug list the renderer dispatches on).
- `schemas.ts` — Zod v4 schemas (`chartSpecSchema`, `plotDataSchema`, `receiptSchema`) using `.strict()` on every object. Use these as the single source of truth for validation at any boundary (file import, API, persisted state). Keep them in lockstep with `types.ts`.
- `index.ts` — the public re-export surface. Always import via `@/lib/chartSpec`, never reach into `./types` or `./schemas` from outside the folder.

**Privacy invariant on `PlotData`:** every variant is aggregated (per-group / per-category / per-series). There are no per-patient rows. Zod `.strict()` rejects unknown keys at every level (including names like `rows`, `patients`, `records`). **`BoxGroup.outliers`** holds numeric outlier values from the aggregate, not patient identifiers. **Don't add raw row-level data to `PlotData`.**

### Browser-only file parser: `src/lib/parser/`

`useFileParser` (`src/lib/parser/useFileParser.ts`) is the single entry point for ingesting user data — CSV via `parseCsv` (papaparse) and `.xlsx` via `parseXlsx` (SheetJS), dispatched on extension. Files over `WORKER_THRESHOLD_BYTES` are parsed in `xlsx.worker.ts` (module worker); construction failures gracefully fall back to the main thread. All parsing is in-browser — **no upload endpoint exists; nothing should ever cross the network with raw row data.** Column-type inference lives in `detectors/` (`primary.ts`, `semantic.ts`) and is consumed via `inferColumnTypes.ts`. Errors are normalised through `errors.ts` (`UNSUPPORTED_FORMAT`, `FILE_EMPTY`, `FILE_TOO_LARGE`, `ABORTED`, …) — surface those codes to UI rather than raw exceptions.

### Chart components: `src/components/charts/`

`chartPreviews.ts` is the registry mapping every `ChartSlug` to a React component (`CHART_PREVIEWS`). When adding a chart slug, you must update both `ChartSlug` in `src/lib/chartSpec/types.ts` (and the matching enum in `schemas.ts`) and the registry. Annotation components (`SignificanceBracket`, `PValueLabel`) live under `annotations/`.

### Pages structure

- `src/app/` — App Router routes. Server components by default; route handlers under `auth/callback/route.ts`.
- `src/components/pages/` — large page-level client components (`Landing`, `Dashboard`, `Upload`, `UploadMap`, `Recommendation`, `Export`, …) that the route files thinly delegate to. The `app/` files are intentionally minimal.
- `src/components/chrome/` — `TopNav`, `Footer`, `FooterGate`, `AccountMenu`. The root layout is async and pre-resolves the user + profile so `TopNav` is rendered server-side with the right state.
- `src/components/primitives/` — small visual building blocks (`RingDivider`, `Wordmark`, `Eyebrow`, `RingLoader`).

### ESLint carve-out for ported prototype code

`eslint.config.mjs` disables `react-hooks/set-state-in-effect`, `react-hooks/static-components`, and `react-hooks/purity` for `src/components/pages/**` and `src/components/charts/**`. These directories hold ported prototype code held to prototype parity — **do not reflexively refactor them to satisfy React 19 / Compiler advisory rules.** That work is tracked separately. New code outside these paths must be Compiler-clean.

### React Compiler

`reactCompiler: true` is set in `next.config.ts`. Avoid manual memoization (`useMemo` / `useCallback` / `React.memo`) for new components outside the carve-out — let the compiler do it. Memoization that already exists in `providers.tsx` is fine; don't churn it.

### Profile + display name

`src/lib/profile.ts` is the canonical reader for the `profiles` Supabase table (DB columns are `snake_case`; the returned `Profile` is `camelCase`). It also defines `displayNameFor`, `greetingNameFor`, `initialsFromNameOrEmail`, and `safeAvatarUrl` (which rejects avatar URLs that aren't on the configured Supabase origin — preserve that allowlist).

## Conventions worth knowing

- Path imports use `@/` (alias to `src/`). Do not use `../../` style relative imports — same-directory `./` is fine.
- The repo follows the Endare house style (see the user's global `~/.claude/CLAUDE.md`): 4-space indent, explicit types/returns, `PascalCase` types, `camelCase` identifiers, `CAPITAL_SNAKE_CASE` constants/enum values, never inline arrays, no nested ternaries, blank line before `return`.
- Server actions live in `actions.ts` files inside the route folder and start with `"use server"`. They mutate via Supabase server client + `revalidatePath` + `redirect`.
- Chart-related work has a domain glossary in `loupe-scrum-board.md` (Loupe Scrum board) — useful when a ticket reference like `LOUPE-01` shows up in a branch name or commit.
