# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: Next.js version

This project uses **Next.js 16.2.4 with React 19.2.4**. APIs, conventions, and file structure differ from older Next.js versions in your training data. Before writing any Next.js code (routing, data fetching, caching, server actions, middleware, config), consult the local docs at `node_modules/next/dist/docs/` — particularly `01-app/` for App Router and `03-architecture/` for runtime/build details. Heed deprecation notices in those docs.

Notable Next 16 specifics already in use here:
- **`src/proxy.ts` is the middleware entry point** (the file formerly known as `middleware.ts`). Do not recreate `middleware.ts`.
- **Server Actions body limit** is raised to 5 MB in `next.config.ts` (avatar upload depends on this).
- **React Compiler** is enabled (`reactCompiler: true`, `babel-plugin-react-compiler`). Do **not** hand-roll `useMemo` / `useCallback` / `memo` unless the compiler genuinely cannot optimise the case — let the compiler do its job.
- **`global.d.ts` re-declares the global `JSX` namespace** so the codebase can keep writing `(): JSX.Element` return types. Keep that shim; do not "fix" it by switching to `React.JSX.Element`.

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint (eslint-config-next core-web-vitals + typescript)
```

There is no test runner configured.

## Project shape

- **App Router only.** Source lives under `src/`. Path alias `@/*` resolves to `./src/*` (see `tsconfig.json`). TypeScript strict mode is on; per Endare standards, declare explicit parameter and return types.
- **Thin App Router pages → fat page components.** Files in `src/app/**/page.tsx` are usually one-liners that render a component from `src/components/pages/` (e.g. `app/page.tsx` → `Landing`, `app/dashboard/page.tsx` → `Dashboard`). When adding a screen, follow the same split.
- **Layout pulls auth + profile server-side.** `src/app/layout.tsx` loads the Supabase user via `createClient(await cookies())`, hydrates a `Profile` from the `profiles` table, and passes a `TopNavUser` into `<TopNav />`. It also wraps everything in `<AppStateProvider>` (`src/app/providers.tsx`) which holds client-only intent / mapping / chartSlug state in `sessionStorage`.

## Auth & Supabase SSR

Three Supabase clients, do **not** mix them:
- `src/utils/supabase/client.ts` — browser client (`createBrowserClient`). Use only in `"use client"` code.
- `src/utils/supabase/server.ts` — server client (`createServerClient` over the `next/headers` cookie store). Used by Server Components, Server Actions, and route handlers. Exports `requireUser()` which redirects to `/auth` when unauthenticated.
- `src/utils/supabase/middleware.ts` — proxy-time client used from `src/proxy.ts` to refresh the session cookie and gate protected routes.

Other auth-relevant pieces:
- **Protected path prefixes** are listed in `src/utils/supabase/middleware.ts` (`/upload`, `/recommend`, `/export`, `/dashboard`, `/library`, `/project`, `/account`). Add new authenticated routes to that array, not via per-page checks.
- **Cookie hardening.** `src/utils/supabase/cookies.ts` forces `httpOnly` / `sameSite=lax` / `secure` (prod) on Supabase auth cookies. Always pass new cookies through `hardenSupabaseCookieOptions`.
- **OAuth callback.** `src/app/auth/callback/route.ts` exchanges the code, mirrors Google profile fields into `profiles` (only filling empty columns so manual edits are preserved), and redirects to a sanitised `next` path.
- **Env bootstrap.** `src/lib/env.ts` reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SITE_URL` via *literal* `process.env.X` access (dynamic access is not statically inlined by the bundler) and throws on missing values at import time.

## Security headers, CSP, and BotID

- `src/proxy.ts` builds a per-request CSP with a fresh nonce (`src/lib/security-headers.ts`), forwards the nonce to the app via the `x-nonce` request header, and stamps both `Content-Security-Policy` on the response and the static security headers from `next.config.ts`. When adding new external origins (scripts, images, connect targets), update `buildCspHeader`, not `next.config.ts`.
- **Vercel BotID** is wired through `withBotId(nextConfig)`, the client init in `src/instrumentation-client.ts` (protects POSTs to `/auth` and `/account`), and the server-side `verifyHuman()` helper in `src/utils/bot-guard.ts`. New mutating Server Actions on protected routes should call `verifyHuman()` first; it fails open on infra outages by design.
- The proxy `matcher` in `src/proxy.ts` excludes the BotID challenge proxy path (`149e9513-…`) — leave that exclusion in place.

## Charts & page components

- `src/components/charts/` holds publication-style chart primitives. They're registered in `src/components/charts/chartPreviews.ts`:
  - `CHART_PREVIEWS: Record<ChartSlug, ComponentType<ChartPreviewProps>>` — small/preview variant.
  - `CHART_PUBLICATION` + `getPublicationChart(slug)` — fuller `PublicationChartProps` variant when one exists; falls back to the preview otherwise.
  - When adding a chart, extend the `ChartSlug` union and register it in both maps.
- `src/components/pages/` and `src/components/charts/` are explicitly held to *prototype parity* — `eslint.config.mjs` disables `react-hooks/set-state-in-effect`, `react-hooks/static-components`, and `react-hooks/purity` for those globs. Don't refactor patterns there to silence those rules; the relaxation is intentional.

## Vercel platform notes

The session loads Vercel-specific guidance (Fluid Compute, AI Gateway, etc.). Only apply that guidance when the task actually involves deployment, server functions, or platform features — do not push platform migrations into unrelated work.
