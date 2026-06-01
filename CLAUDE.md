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
npm run smoke:recommend  # end-to-end smoke for the recommend Server Action
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

Additional routes outside the wizard: `/dashboard`, `/library`, `/project/[id]`, `/project/[id]/style`, `/account`.

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

`src/lib/ai/recommendChart.ts` is a `"use server"` Server Action invoked from the `useRecommendation` hook (`src/components/pages/uploadMap/useRecommendation.ts`), mounted in `Recommendation.tsx` (via `RecommendationAiPending`), gated on `selectionMode === "ai"`. It runs `generateObject` with a strict Zod output schema and returns a typed `RecommendResult` — either a `Receipt` + `chartType` on success, or an error code.

**AI infrastructure sub-modules** (`src/lib/ai/`):
- `rateLimit/` — per-actor rate limiting via `checkAndRecord`; actor key derived from user/IP
- `budget/` — daily token counter + ceiling enforcer to cap spend
- `recommendCache/` — deterministic hash-keyed cache for AI results; canonical payload → SHA hash → stored entry with Zod re-validation on read
- `phi/detect.ts` — client-side PHI column-name detector; matched headers must be renamed before the payload is assembled
- `prompts/` — `recommend.system.ts` (system prompt) + `recommend.user.ts` (user prompt builder)
- `recommendChart.pricing.ts` — cost estimate in EUR from token counts

### Privacy invariant

Patient-level data must never reach the server. This is enforced at two layers:

1. **Parser**: `PrivateRows` is a branded type — raw data rows cannot leave `src/lib/parser/` without explicit `brandRows()`. Files >5 MB are offloaded to a WebWorker (`xlsx.worker.ts`).
2. **AI payload guard**: `payloadSchema` in `src/lib/ai/recommendChart.schemas.ts` uses a deep `superRefine` that rejects any payload containing keys named `rows`, `data`, `values`, `sample`, etc. A PHI column-name detector (`src/lib/ai/phi/detect.ts`) runs client-side before the payload is assembled; matched headers must be renamed before proceeding.

### Chart system

`ChartSlug` (`src/lib/chartSpec/types.ts`) is the wide union of all 25+ chart types. `SpecKind` is the 4-type V1 subset with full Spec + PlotData: `km` (Kaplan–Meier), `barError` (bar with error bars), `box` (box plot), `xy` (line/scatter). All other slugs have a preview React component but no ChartSpec or PlotData — they are UI-only placeholders.

- Types and discriminated unions: `src/lib/chartSpec/types.ts`
- Zod schemas: `src/lib/chartSpec/schemas.ts`
- Default spec factory: `src/lib/chartSpec/factory.ts`
- `resolveWizardChartSpec.ts` — entry point that creates/reuses a spec and applies customizations and longitudinal routing for `xy`
- `PlotData` variants are always **aggregated** — per-patient rows are forbidden in rendering types

**ChartSpec sub-modules** (`src/lib/chartSpec/`):
- `aggregators/` — one file per SpecKind (`barError.ts`, `boxPlot.ts`, `kaplanMeier.ts`, `xyPlot.ts`) plus shared helpers (`errorBars.ts`, `greenwood.ts`, `linearRegression.ts`, `longitudinalAggregator.ts`, `nAtRiskAtTime.ts`, `quantileType7.ts`, `tCritical.ts`)
- `customizations/patchSpec.ts` — pure functions (`updateCustomizationTitle`, `updateAxisLabel`, `updatePalette`, `patchSpecKind`) that return new spec objects; exported `SpecUpdater = (prev: ChartSpec) => ChartSpec`
- `labels/` — `deriveLabel.ts`, `deriveTitle.ts`, `resolveChartLabels.ts`, `buildCustomizations.ts` (attaches `Customizations` overlay onto a spec)
- `resolvePalette.ts` — maps `PaletteName` to hex array
- `constants.ts` — shared numeric/string constants

`Receipt` (`src/lib/chartSpec/types.ts`) is the reproducibility record bound to a chart. It carries `selectionMode` (`"ai"` | `"manual"`), intent, recommendation copy, alternatives, transformations, and statistical tests.

### Column roles

`src/lib/roles/` — typed roles (`time`, `event`, `group`, `outcome`, `predictor`, `x`, `y`, `id`, `ignore`) with compatibility rules per chart intent (`km`, `bar-error`, `box`, `xy`, `any`). `autoMapColumns` heuristically assigns roles based on column names and inferred types.

### Customization rail

`src/components/customization/` — the right-hand panel on `/export` (and `/recommend`). Each `SpecKind` has its own rail component (`KmRail` does not yet exist; current V1 rails: `BarRail`, `BoxRail`, `XYRail`). `CustomizationRail` dispatches to the correct rail based on `spec.kind`.

- `PaletteSelector.tsx` — color-scheme picker; values are `PaletteName` members
- `TitleInput.tsx` / `AxisLabelInput.tsx` / `InlineEditableText.tsx` — controlled inputs that call `SpecUpdater` callbacks
- All rail mutations go through `patchSpec` pure functions — never mutate the spec directly

### ExportChat

`src/components/pages/ExportChat/` — a scripted-response chat panel on `/export` that drives customization changes via natural language.

- `scriptedExchanges.ts` — static list of `ScriptedExchange` objects; each has `match` patterns, a `response` string, an optional `patch: Partial<ChartConfig>`, and an optional `railHint` to highlight a rail section
- `ExportChatPanel.tsx` — renders the conversation; applies `patch` to state and fires `railHint` callbacks
- `ExportChatLauncher.tsx` — the floating button that opens/closes the panel
- `types.ts` — `ChartConfig`, `ChatMessage`, `ChatRevision`, `ScriptedExchange`, `RailSection`

ExportChat is currently scripted (no live AI call). It pattern-matches user input against `ScriptedExchange.match` arrays.

### D3 rendering layer

`src/components/charts/d3/` — framework-agnostic D3 rendering utilities shared by all four SpecKind chart components:

- `BarErrorChart.tsx`, `BoxChart.tsx`, `KaplanMeierChart.tsx`, `XYChart.tsx` — SVG chart components; each accepts typed PlotData and a ChartSpec
- `applyAxes.ts`, `applyChartLabels.ts`, `applyDesignTokens.ts` — D3 setup helpers
- `palettes.ts` + `palettes.module.css` — token → hex resolution; `PALETTE_SWATCH_HEX` for UI swatches
- `useResizeObserver.ts` — ResizeObserver hook for responsive SVG sizing
- `chart.types.ts` — shared D3 prop interfaces

`src/components/charts/annotations/` — `SignificanceBracket.tsx`, `PValueLabel.tsx`.
`src/components/charts/legend/` — `ChartLegend.tsx` + glyph sub-components.
`src/components/charts/SpecChartPanel.tsx` — wrapper that combines the D3 chart, legend, annotations, and at-risk table into a single panel.

### Recommendation override flow

`src/components/pages/Recommendation.tsx` uses `RecommendationOverride` and `RecommendationWhy` to let users switch from the AI-recommended chart kind to another within the same SpecKind set. The override history is stored in the `Receipt` (via `overrideEvents`) and formatted by `formatOverrideHistory.ts`. `overrideDisplay.ts` computes display state (visible vs. collapsed) from that history.

`src/lib/recommendation/detectLongitudinal.ts` — detects whether the mapped columns form a longitudinal (repeated-measures) XY dataset, which triggers the `applyXYLongitudinalRouting` branch in `resolveWizardChartSpec`.

### Component organization

- `src/app/<route>/page.tsx` — thin: auth guard + component import only
- `src/components/pages/<feature>/` — page-level logic and subcomponents
- `src/components/charts/` — one file per chart type; `chartPreviews.ts` maps slugs to metadata; `chartDisplayNames.ts` maps slugs to human labels
- `src/components/charts/d3/` — D3 rendering primitives and SpecKind chart components
- `src/components/customization/` — customization rail components
- `src/components/chrome/` — `TopNav`, `Footer`, `FooterGate`, `AccountMenu`
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
