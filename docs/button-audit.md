# LOUPE-37 Button audit inventory

Audited: 2026-06-08 (expanded pass). Wizard CTA inventory: **64** elements with `btn btn--*` classes across **31** files.

Count verification: `git grep -nE 'className=["\`][^"\`]*btn--' src/ | wc -l` → **62** (single-line `className` only). **+2** `DashboardChartGrid.tsx` tag-filter buttons use multiline `className` ternaries (lines 30–33, 43–46) — listed below as separate rows. Total audited rows: **64**. Desktop guest **Sign in** uses `nav-link` (not `btn--*`).

## Summary (post-LOUPE-37)

| Class | Role |
|-------|------|
| `btn--primary` | Amber forward action (one per screen zone) |
| `btn--secondary` | Paper + ink border secondary action |
| `btn--quiet` | Text-only tertiary / navigation |

`btn--ghost` retired → `btn--secondary`. `global-error.tsx` uses inline amber styles (no `btn` class) — noted separately.

## Inventory

| File | Line | Element label | Class | Category notes |
|------|-----:|---------------|-------|----------------|
| Landing.tsx | 56 | Start a chart | primary | Hero CTA |
| Landing.tsx | 63 | See how it works | quiet | Hero secondary |
| TopNav.tsx | 157 | Sign in | nav-link | Desktop guest nav (paper color, not `btn--*`) |
| TopNav.tsx | 164 | Start creating | primary | Desktop guest nav |
| TopNav.tsx | 238 | Sign in | secondary | Mobile drawer |
| TopNav.tsx | 245 | Start creating | primary | Mobile drawer |
| TopNav.tsx | 255 | Sign in | secondary | Mobile drawer (authed) |
| TopNav.tsx | 261 | Sign out | primary | Mobile drawer submit |
| Upload.tsx | 322 | Continue | primary | Sheet picker continue |
| Upload.tsx | 334 | Choose a different file | secondary | Sheet repick |
| Upload.tsx | 371 | Browse files | secondary | Dropzone browse |
| Upload.tsx | 382 | Browse files | secondary | Dropzone browse (empty) |
| Upload.tsx | 430 | Browse files | secondary | Inline browse |
| Upload.tsx | 498 | Continue to column mapping | primary | Upload forward |
| UploadMap.tsx | 72 | Replace file | quiet | Header utility |
| UploadMap.tsx | 97 | Continue to recommendation | primary | Map forward |
| MappingResetDialog.tsx | 100 | Cancel | secondary | Dialog dismiss |
| MappingResetDialog.tsx | 106 | Reset mapping | primary | Dialog confirm |
| PhiWarning.tsx | 58 | Rename columns | primary | PHI gate |
| PhiWarning.tsx | 63 | Cancel upload | secondary | PHI dismiss |
| PhiWarning.tsx | 66 | Send anyway | quiet | PHI override (discouraged path) |
| PhiRenameModal.tsx | 100 | Cancel | secondary | Modal dismiss |
| PhiRenameModal.tsx | 103 | Save renames | primary | Modal confirm |
| RecommendChoose.tsx | 93 | Choose this path (×2 cards) | primary | AI vs manual choice |
| RecommendationActionsPanel.tsx | 27 | Customize | primary | Recommend forward |
| RecommendationActionsPanel.tsx | 44 | Pick a chart myself | quiet | Switch to manual |
| RecommendationAiPending.tsx | 103 | Try again | secondary | AI error recovery |
| RecommendationAiPending.tsx | 115 | Pick a chart myself | quiet | AI error → manual |
| RecommendManual.tsx | 227 | Back | quiet | Manual picker nav |
| ExportFigureActions.tsx | 31 | Download SVG | primary | Export figure CTA |
| ExportFigureActions.tsx | 65 | Download PNG | secondary | Export figure alt |
| ExportProjectActions.tsx | 27 | Retry receipt build | quiet | Receipt error |
| ExportProjectActions.tsx | 40 | Save to project | primary | Project save |
| ExportProjectActions.tsx | 46 | Start new chart | quiet | Wizard restart |
| Export.tsx | 1284 | Open customize panel | primary | Mobile rail toggle |
| Export.tsx | 1294 | Reset customizations | quiet | Rail utility |
| Export.tsx | 1739 | (annotation control) | quiet | Figure annotation |
| Export.tsx | 1886 | Add annotation | secondary | Figure annotation |
| Export.tsx | 1898 | Reset customizations | quiet | Rail reset duplicate |
| SaveChartDialog.tsx | 81 | Cancel | secondary | Save dialog |
| SaveChartDialog.tsx | 82 | Save | primary | Save dialog |
| ExportChatPanel.tsx | 148 | Close chat | quiet | Chat chrome |
| ExportChatPanel.tsx | 165 | Scripted chip (per exchange) | secondary | Chat suggestion |
| ExportChatPanel.tsx | 219 | Send | primary | Chat submit |
| ReproducibilityReceiptPanel.tsx | 161 | Copy JSON | quiet | Receipt utility |
| ReproducibilityReceiptPanel.tsx | 179 | Copy citation | quiet | Receipt utility |
| ReproducibilityReceiptPanel.tsx | 187 | Download .txt | quiet | Receipt utility |
| Library.tsx | 210 | Start a chart | primary | Library forward |
| ProjectStyle.tsx | 81 | Back to dashboard | quiet | Style page nav |
| ViewOnlyNotice.tsx | 25 | Start a new chart | primary | View-only gate |
| Auth.tsx | 170 | Continue / Sign in | primary | Auth submit |
| Dashboard EmptyState.tsx | 12 | Create your first chart | primary | Dashboard empty |
| DashboardChartGrid.tsx | 32 | All (tag filter) | primary / secondary | Active = primary |
| DashboardChartGrid.tsx | 45 | Tag name (per tag) | primary / secondary | One button per tag at runtime |
| DashboardLoadError.tsx | 22 | Try again | primary | Dashboard error |
| DeleteChartButton.tsx | 100 | Cancel | secondary | Delete confirm |
| DeleteChartButton.tsx | 107 | Delete | primary | Delete confirm |
| error.tsx | 24 | Try again | primary | Route error |
| error.tsx | 27 | Go to dashboard | secondary | Route error |
| export/error.tsx | 28 | Try again | primary | Export route error |
| export/error.tsx | 34 | Go to dashboard | secondary | Export route error |
| AccountForm.tsx | 236 | Save profile | primary | Account settings |
| EmailForm.tsx | 82 | Update email | primary | Account settings |
| PasswordForm.tsx | 80 | Cancel | secondary | Password change |
| PasswordForm.tsx | 144 | Update password | primary | Password change |

## Out of scope (inline / non-`btn`)

| File | Line | Element | Notes |
|------|-----:|---------|-------|
| global-error.tsx | 25 | Try again | Inline amber `#8F4F17` — outside main layout, no `btn` classes |
| global-error.tsx | 39 | Go to dashboard | Inline paper secondary link |

## Excluded from wizard audit

These UI controls use `<button>` but are not wizard primary/secondary/quiet CTAs:

| Pattern | Example location | Reason |
|---------|------------------|--------|
| Palette swatches | `PaletteSelector.tsx` | Color picker chips, not navigation CTAs |
| Chart type cards | `Library.tsx`, `RecommendManual.tsx` | Card selection affordances |
| Kebab / overflow menus | `ChartCard.tsx`, `AccountMenu.tsx` | Icon menus |
| DPI format chips | `Export.tsx` `.export-dpi button` | Export format toggle |
| Type badges / role pills | `UploadMap.tsx` column roles | Mapping UI, not wizard flow |
| `btn-google` | `Auth.tsx` | Dedicated OAuth affordance |
| `Use instead →` | `RecommendationWhy.tsx` | `link-arrow` text control, not `btn` |

## Notes

- RecommendChoose renders two identical primary CTAs (AI card + manual card) — one row documents both.
- ExportChat scripted chips repeat per `ScriptedExchange` at runtime; single representative row in table.
- Dashboard tag filters: static grep under-counts by 2 because of multiline `className` ternaries.
