# sessionStorage Keys

All Loupe wizard state is stored in `sessionStorage` (never `localStorage`). The table below lists every key written by the application, its purpose, and its lifecycle.

> **Privacy invariant:** no patient-level row data ever reaches `sessionStorage`. Only column-level metadata (`ColumnInference[]`) is persisted under `loupe.dataset`.

| Key | Purpose | Written by | Cleared by | Survives refresh? | Survives tab close? |
|---|---|---|---|---|---|
| `loupe.intent` | Free-text research intent entered on `/upload/map` | `AppStateProvider.setIntent` (`src/app/providers.tsx`) | Never explicitly removed — persists until the user edits it or the tab closes | Yes | No |
| `loupe.dataset` | Serialised `ColumnInference[]` (column names, types, sample stats — no row data) | `AppStateProvider.setDataset` (`src/app/providers.tsx`) | `AppStateProvider.clearDataset` | Yes | No |
| `loupe.datasetSource` | File metadata: `fileName`, `rowCount`, `sheetName` — used to detect re-uploads that should bust the AI cache | `AppStateProvider.setDataset` (when `source` arg is provided) | `AppStateProvider.clearDataset` | Yes | No |
| `loupe.mapping` | Column-role mapping object (`Mapping`) from `/upload/map` | `AppStateProvider.setMapping` (`src/app/providers.tsx`) | Never explicitly removed — persists until overwritten or tab closes | Yes | No |
| `loupe.selectionMode` | Wizard path: `"ai"` or `"manual"` | `AppStateProvider.setSelectionMode` (`src/app/providers.tsx`) | `AppStateProvider.setSelectionMode(null)` | Yes | No |
| `loupe.receipt` | `Receipt` provenance record (AI rationale, alternatives, transformations; includes append-only `overrides[]` with `{ from, to, at, reason? }` per user chart switch) | `AppStateProvider.setReceipt` and `AppStateProvider.appendOverride` (`src/app/providers.tsx`) | `AppStateProvider.clearDataset`; `AppStateProvider.setReceipt(null)` | Yes | No |
| `loupe.chartKind` | Active `SpecKind` (`"km"` \| `"barError"` \| `"box"` \| `"xy"`) | `AppStateProvider.setChartKind` (`src/app/providers.tsx`) | `AppStateProvider.clearDataset`; `AppStateProvider.setChartKind(null)` | Yes | No |
| `loupe.recommendCache` | JSON cache file (`{ version: 1, entries: CacheEntry[] }`) — AI recommendation results keyed by SHA-256 payload hash, TTL 24 h, max 20 entries | `setCacheEntry` (`src/lib/ai/recommendCache/cache.ts`) | `clearCache` (called by `AppStateProvider.clearDataset` and on dataset file change in `AppStateProvider.setDataset`); `QuotaExceededError` silently drops the write | Yes | No |
| `loupe.chatOpened` | Flag (`"1"`) indicating the user has opened the export-chat panel — suppresses the first-visit nudge | `ExportChatLauncher` (`src/components/pages/ExportChat/ExportChatLauncher.tsx`) | Never removed — persists for the session | Yes | No |

## Notes

- **Hydration guard:** `AppStateProvider` validates each key against its Zod schema on hydration (`useEffect`) and silently drops malformed entries. Components should gate on `hydrated === true` before rendering to avoid stale-state flicker.
- **`loupe.selectionMode` reset semantics:** switching between `"ai"` and `"manual"` clears `chartSlug` and `chartSpec` from in-memory state, but `loupe.mapping` and `loupe.intent` are intentionally preserved so users can round-trip without redoing column mapping.
- **Cache eviction:** `loupe.recommendCache` applies two eviction passes on every read — schema/validation sanitisation (removes structurally invalid entries) followed by TTL eviction (removes entries older than 24 h). Capacity is capped at 20 entries; oldest by `cachedAt` are dropped when the limit is exceeded.
- **`QuotaExceededError`:** writes to `loupe.recommendCache` silently degrade when `sessionStorage` is full — the recommendation flow continues without caching. See `src/lib/ai/recommendCache/cache.ts` for details.
