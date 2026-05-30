# Loupe Async Flow Audit
Generated: 2026-05-30

## Summary
- Total flows audited: 38
- P0 gaps: 3
- P1 gaps: 18
- P2 gaps: 17

## Flows

| # | Flow | File | Loading | Error | Retry | Toast | Severity |
|---|------|------|---------|-------|-------|-------|----------|
| 1 | CSV parse (PapaParse worker) | `src/lib/parser/parseCsv.ts` L17–108; `src/lib/parser/useFileParser.ts` L263–312 | Text prompt “Reading on your device…” (`Upload.tsx` L218–230); `aria-busy` on dropzone (`Upload.tsx` L262) | Caught → `ParseState.error`; inline alert + “Try again” (`Upload.tsx` L402–413) | Yes — “Try again” resets via `onReplace` | No | P2 |
| 2 | Excel/XLSX first-pass parse | `src/lib/parser/useFileParser.ts` L314–369; `src/lib/parser/parseXlsx.ts`; `src/lib/parser/xlsx.worker.ts` | Same scanning UI as CSV (`Upload.tsx` L218–230) | Caught → inline alert (`useFileParser.ts` L370–372) | Yes — “Try again” on replace | No | P2 |
| 3 | Excel sheet selection parse | `src/lib/parser/useFileParser.ts` L375–427 | Scanning prompt while `status: "parsing"` | Caught → inline alert | Yes — pick another sheet or replace file | No | P2 |
| 4 | Return to worksheet picker | `src/lib/parser/useFileParser.ts` L429–485 | Scanning prompt | Caught → inline alert | Yes — re-upload | No | P2 |
| 5 | AI chart recommendation (server action) | `src/components/pages/uploadMap/useRecommendation.ts` L26–59; `src/lib/ai/recommendChart.ts` L32–154 | `RingLoader` + disabled Continue (`UploadMap.tsx` L75–76, L157–161) | Typed error card with message (`UploadMap.tsx` L121–146); server returns error codes | Yes — “Try again” (disabled when `RATE_LIMITED`) | No | P1 |
| 6 | AI recommendation session cache read | `src/lib/ai/recommendCache/cache.ts` L62–76 | None (instant hit skips loading state) | Silent miss → falls through to network call | N/A (cache miss is normal) | No | P2 |
| 7 | AI recommendation session cache write | `src/lib/ai/recommendCache/cache.ts` L78–103 | None | Silent drop on validation failure or `QuotaExceededError` (`cache.ts` L43–48) | No | No | P2 |
| 8 | AI reasoning / receipt generation (LLM) | `src/lib/ai/recommendChart.ts` L83–138 (`generateObject`) | Covered by flow #5 loading UI | Returned as `RecommendResult` error; `console.error` on server (`recommendChart.ts` L96, L150) | Via flow #5 retry | No | P1 |
| 9 | AI rate limit / actor key | `src/lib/ai/rateLimit/rateLimit.ts`; `src/lib/ai/rateLimit/actorKey.ts` L21–39 | None | `RATE_LIMITED` result to client; `console.error` on DB failures server-side | Blocked until window expires | No | P2 |
| 10 | Chart D3 mount / resize | `src/components/charts/d3/KaplanMeierChart.tsx` L46–80 (+ Bar/Box/XY equivalents) | Staged `RingLoader` on `/recommend` only (`Recommendation.tsx` L258–260); none on `/export` | Aggregation errors shown inline (`SpecChartPanel.tsx` L33–37, L91–92) | No | No | P1 |
| 11 | Save chart to Supabase | `src/components/pages/Export.tsx` L865–903; `src/app/charts/actions.ts` L97–225 | Disabled button + “Saving…” (`Export.tsx` L1212–1215) | `setSaveError` inline alert (`Export.tsx` L1226–1229); server returns `{ success: false, error }` | No | No | P1 |
| 12 | Thumbnail generation (on save) | `src/lib/thumbnail/generateThumbnail.ts` L48–66 | Covered by save loading state | Silent fallback to static icon (`generateThumbnail.ts` L61–64) | No | No | P2 |
| 13 | Load charts (dashboard) | `src/app/dashboard/page.tsx` L9–11; `src/lib/charts/listCharts.ts` L20–57 | None (SSR; no `loading.tsx`) | `console.error` + returns `[]` — renders empty state (`listCharts.ts` L36–39, L53–55) | No | No | **P0** |
| 14 | Load chart (export page) | `src/app/export/page.tsx` L9–15; `src/app/charts/actions.ts` L227–290; `Export.tsx` L587–619 | None (SSR) | `getChart` → `null` + `console.error`; client shows “Chart not found.” (`Export.tsx` L596–602, L1067–1083) | No — link back to dashboard only | No | P1 |
| 15 | Delete chart | `src/app/dashboard/DeleteChartButton.tsx` L22–33; `src/app/charts/actions.ts` L292–314 | “Deleting…” disabled button (`DeleteChartButton.tsx` L68–73) | Inline alert in dialog (`DeleteChartButton.tsx` L52–55) | No | No | P1 |
| 16 | SVG export | `src/components/pages/Export.tsx` L837–863; `src/lib/export/exportSvg.ts` L282–289 | “Exporting…” disabled button (`Export.tsx` L1163–1166) | `setExportError` inline alert (`Export.tsx` L1199–1202) | No | No | P1 |
| 17 | PNG export (300 / 600 dpi) | `src/components/pages/Export.tsx` L812–835; `src/lib/export/exportPng.ts` L89–133 | Per-DPI `RingLoader` + “Exporting…” (`Export.tsx` L1184–1187) | `setExportError` inline alert | No | Yes — ad-hoc `dash-toast` if fonts fail (`exportPng.ts` L130–131 → `Export.tsx` L1734–1737) | P1 |
| 18 | Export font fetch | `src/lib/export/fontCache.ts` L15–48 | Covered by export loading states | `console.warn`; export continues without embedded font | No | PNG path fires font-warning toast (flow #17) | P2 |
| 19 | Save receipt compose + hash (persisted chart) | `src/lib/receipt/buildReceipt.ts` L28–52; `Export.tsx` L697–725 | None while hashing | `.catch()` swallows error → `computedReceipt` stays `null` silently (`Export.tsx` L721–724) | No | No | **P0** |
| 20 | Reproducibility receipt compose (panel) | `src/lib/receipt/composeReceipt.ts` L360–373; `ReproducibilityReceiptPanel.tsx` L38–70 | `RingLoader` + “Preparing…” (`ReproducibilityReceiptPanel.tsx` L140–143) | Inline alert (`ReproducibilityReceiptPanel.tsx` L167–170) | No | No | P1 |
| 21 | Receipt SHA-256 hash | `src/lib/receipt/hashSpec.ts` L18–28 | Covered by parent flows | Thrown to caller (compose/build) | No | No | P2 |
| 22 | Receipt clipboard copy | `src/lib/receipt/copyToClipboard.ts` L1–23; `ReproducibilityReceiptPanel.tsx` L86–99 | Button shows “Copied!” state | Inline alert on failure | No | No (inline button feedback only) | P2 |
| 23 | Sign in (email/password) | `src/app/auth/actions.ts` L33–46; `Auth.tsx` L45–48 | Disabled submit + “Signing in…” (`Auth.tsx` L29–34, L140–142) | Inline `auth-error` (`Auth.tsx` L127–130) | User resubmits form | No | P1 |
| 24 | Sign up (email/password) | `src/app/auth/actions.ts` L48–81 | Disabled submit + “Creating account…” | Generic success message or validation error (`Auth.tsx` L132–135) | User resubmits | No | P2 |
| 25 | Google OAuth start | `Auth.tsx` L50–66 | “Redirecting…” + disabled button (`Auth.tsx` L152–155) | Inline `oauthError` (`Auth.tsx` L62–64) | User clicks again | No | P1 |
| 26 | OAuth / email callback | `src/app/auth/callback/route.ts` L58–113 | Browser redirect (no in-app spinner) | Redirect to `/auth?error=oauth` or `?error=callback` (`route.ts` L64, L72); shown in `Auth.tsx` L18–26 | User retries sign-in | No | P1 |
| 27 | Sign out | `src/app/auth/actions.ts` L106–112; `TopNav.tsx` L233 | None (form submit) | Uncaught redirect path; no user-visible error | No | No | P2 |
| 28 | Password change (reauth + update) | `src/app/account/actions.ts` L300–368; `PasswordForm.tsx` | “Sending…” / “Updating…” disabled buttons (`PasswordForm.tsx` L59–65, L128–130) | Inline `auth-error` (`PasswordForm.tsx` L113–116) | “Resend verification code” (`PasswordForm.tsx` L63–64) | No (inline `account-success`) | P1 |
| 29 | Email change | `src/app/account/actions.ts` L271–298; `EmailForm.tsx` | “Sending links…” disabled submit (`EmailForm.tsx` L73–75) | Inline `auth-error` / `account-success` | User resubmits | No | P1 |
| 30 | Avatar upload | `src/app/account/actions.ts` L165–227; `AvatarUploader.tsx` | “Uploading…” disabled controls (`AvatarUploader.tsx` L111–112) | Inline `auth-error` (`AvatarUploader.tsx` L135–138) | User picks file again | No | P1 |
| 31 | Avatar remove | `src/app/account/actions.ts` L229–269; `AvatarUploader.tsx` | “Removing…” (`AvatarUploader.tsx` L127) | Shared error display with upload | User retries | No | P2 |
| 32 | Profile save | `src/app/account/actions.ts` L54–130; `AccountForm.tsx` | “Saving…” disabled submit (`AccountForm.tsx` L223–225) | Inline `auth-error` / `account-success` | User resubmits | No | P1 |
| 33 | Profile load (layout + account) | `src/lib/profile.ts` L109–132; `src/app/layout.tsx` L46–65 | None (SSR) | `console.error` → `EMPTY_PROFILE` silently | No | No | P2 |
| 34 | Wizard session hydration | `src/app/providers.tsx` L221–254 | None; gates render (`RecommendGate.tsx` L72–74 returns `null`) | Malformed sessionStorage keys dropped silently | No | No | P1 |
| 35 | Export figure “Copy to clipboard” | `Export.tsx` L781–784, L1195–1197 | Toggles label to “Copied to clipboard ✓” | **No clipboard API call** — UI-only stub | No | No | **P0** |
| 36 | Bot protection (`verifyHuman`) | `src/utils/bot-guard.ts`; used in `auth/actions.ts` L87, `account/actions.ts` | Inherited from form pending states | Returned as form error string | User resubmits | No | P2 |
| 37 | RecommendGate spec resolution | `src/components/pages/RecommendGate.tsx` L37–70; `src/lib/chartSpec/resolveWizardChartSpec.ts` | Returns `null` until resolved (blank page) | Redirect to `/upload/map` if missing state (`RecommendGate.tsx` L32–34) | User re-enters wizard | No | P1 |
| 38 | Mock dashboard download toasts (unused route component) | `src/components/pages/Dashboard.tsx` L137–141, L331–334 | N/A — instant fake success | N/A — no real download | N/A | Yes — ad-hoc `dash-toast` on fake SVG/PNG actions | P2 |

## P0 gaps (detail)

**Dashboard chart list fails silently.** When `listCharts()` hits a Supabase error or unexpected exception, it logs to the server console and returns an empty array (`src/lib/charts/listCharts.ts` L36–39, L53–55). The dashboard page renders `EmptyState` as if the user has no saved charts (`src/app/dashboard/page.tsx` L17–18). During a demo or after saving work, a transient DB or auth cookie issue looks identical to an empty account — the user cannot open saved charts and may believe data was lost. Fix requires distinguishing error vs. empty, surfacing a recoverable error UI with retry, and optionally a `loading.tsx` / skeleton while the server fetch runs.

**Save receipt hash fails silently before save.** `buildReceipt()` runs in a fire-and-forget `useEffect` on `/export` (`Export.tsx` L697–725). Any rejection is caught with an empty handler that sets `computedReceipt` to `null` without user feedback. The “Save to project” button then fails with “Save unavailable: chart data is incomplete.” (`Export.tsx` L870–872) even though the chart renders fine. This blocks the primary persist path with a misleading message. Fix requires explicit error state on the hash/build step, retry, and tying save-button disabled state to a visible “preparing receipt” / error region.

**Export “Copy to clipboard” is a non-functional stub.** The main export actions include a “Copy to clipboard” button (`Export.tsx` L1195–1197) whose handler only toggles local `copied` state for 1.6 s (`Export.tsx` L781–784). It never calls `copyToClipboard` or `navigator.clipboard`. In a jury setting, clicking it appears to succeed while nothing is copied. Fix requires wiring to the shared clipboard helper (as used in `ReproducibilityReceiptPanel`) or removing the control until implemented.

## Existing partial toast implementations

| Location | Mechanism | Purpose |
|----------|-----------|---------|
| `src/components/pages/Export.tsx` L571, L786–810, L1734–1737 | `fontWarningToast` state + `dash-toast` CSS class, 4 s auto-dismiss | Warns when PNG export used fallback fonts (`loupe:font-warning` event from `exportPng.ts` L130–131) |
| `src/components/pages/Dashboard.tsx` L102–130, L331–334, L341 | `toast` state + `dash-toast`, 1.8 s auto-dismiss | Fake “Saved · SVG/PNG” and “Chart updated · new data applied” for **mock** dashboard (not wired to `app/dashboard/page.tsx`) |
| `src/components/pages/ReproducibilityReceiptPanel.tsx` L140–145 | Inline button label “Copied!” (2 s), not `dash-toast` | Receipt markdown copy feedback |
| `src/components/pages/Export.tsx` L537, L781–784, L1196 | Inline button label “Copied to clipboard ✓” | **Stub** — no clipboard write |
| `src/components/pages/Auth.tsx` L132–135 | `auth-info` paragraph (`role="status"`) | Sign-up confirmation message |
| `src/app/account/AccountForm.tsx` L232–235 | `account-success` paragraph | Profile saved confirmation |
| `src/app/account/EmailForm.tsx` L63–66 | `account-success` paragraph | Email change links sent |
| `src/app/account/PasswordForm.tsx` L118–121 | `account-success` paragraph | Code sent / password updated |
| `src/components/pages/ExportChat/ExportChatLauncher.tsx` L45 | `chat-nudge` (`role="status"`) | Scripted chat hint bubble |

There is **no shared toast provider** — each site owns its own timer + markup.

## Error boundary coverage

Next.js error boundaries require `error.tsx` (route segment), `global-error.tsx` (root), or `not-found.tsx`. **None exist** under `src/app/`.

| Route | Page file | `error.tsx` | `loading.tsx` | Notes |
|-------|-----------|-------------|---------------|-------|
| `/` | `src/app/page.tsx` | No | No | Static landing |
| `/auth` | `src/app/auth/page.tsx` | No | No | Client form errors inline |
| `/auth/callback` | `src/app/auth/callback/route.ts` | No | No | Route handler; redirects on failure |
| `/dashboard` | `src/app/dashboard/page.tsx` | No | No | Async RSC; list errors swallowed |
| `/upload` | `src/app/upload/page.tsx` | No | No | Parse errors inline |
| `/upload/map` | `src/app/upload/map/page.tsx` | No | No | AI errors inline |
| `/recommend` | `src/app/recommend/page.tsx` | No | No | Blank until gate hydrates |
| `/recommend/choose` | `src/app/recommend/choose/page.tsx` | No | No | Sync client page |
| `/recommend/manual` | `src/app/recommend/manual/page.tsx` | No | No | Sync client page |
| `/export` | `src/app/export/page.tsx` | No | No | Load/save/export errors inline |
| `/library` | `src/app/library/page.tsx` | No | No | Static placeholder |
| `/account` | `src/app/account/page.tsx` | No | No | Form errors inline |
| `/project/[id]/style` | `src/app/project/[id]/style/page.tsx` | No | No | Mock project UI |
| Root layout | `src/app/layout.tsx` | No | No | No `global-error.tsx` |

Unhandled render throws in any segment will fall through to the Next.js default error overlay in development or a generic error page in production.

## Notes for implementation

1. **Unify on a single toast/notification layer.** Three patterns coexist: `dash-toast` (Export font warning, mock Dashboard), inline `role="alert"` paragraphs, and inline `role="status"` success lines. Prompt 2 should extract a shared hook or provider and migrate ad-hoc timers first (`Export.tsx`, then delete or rewiring mock `Dashboard.tsx` toasts if that component is retired).

2. **Server fetch flows need explicit trinary states.** `listCharts`, `getChart`, and `loadProfile` collapse failures into empty/null with console logging only. Client pages cannot show retry without either (a) server actions that return `{ ok, error }` unions or (b) route-level `error.tsx` + `loading.tsx` boundaries.

3. **Align loading vocabulary.** `RingLoader` appears on AI recommend, receipt panel, recommend chart reveal, and PNG export — but not on CSV parsing (text only), dashboard SSR, export SSR chart load, or D3 mount on `/export`. A consistent “busy” primitive would reduce jury confusion.

4. **Retry is sparse.** Only upload parse errors, AI recommendation (`UploadMap.tsx`), and password resend expose retry. Save, delete, export, and dashboard fetch have no retry affordance.

5. **Silent `.catch()` handlers are high-risk.** Audit targets: `Export.tsx` `buildReceipt` effect (L721–724), `generateThumbnail` fallback, `recommendCache` quota swallow, `listCharts` empty fallback, and `providers.tsx` sessionStorage write failure on large datasets (`providers.tsx` L329–333).

6. **`src/hooks/` and `src/actions/` do not exist.** Server actions live in `src/app/charts/actions.ts`, `src/app/auth/actions.ts`, and `src/app/account/actions.ts`. Client orchestration hooks are colocated (`useFileParser`, `useRecommendation`, `useUploadMap`).

7. **Two dashboard implementations.** Production route uses `src/app/dashboard/page.tsx` + `ChartCard`. `src/components/pages/Dashboard.tsx` is a mock with fake async toasts and is not imported by the app route — avoid mixing them during LOUPE-22 fixes.

8. **Export clipboard and receipt copy should share** `src/lib/receipt/copyToClipboard.ts` to avoid a second implementation path.

9. **Font warning toast is event-driven** (`document.dispatchEvent(new CustomEvent("loupe:font-warning"))`). A unified notification system should support imperative API for non-React callers (export pipeline) as well as component-level calls.

10. **RecommendGate blank flash.** Returning `null` until `hydrated && receipt && chartKind && resolvedSpec` (`RecommendGate.tsx` L72–74) produces an empty main area with no skeleton. Consider a route-level loading boundary or a dedicated gate skeleton component.
