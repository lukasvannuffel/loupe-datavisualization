# Loupe — SCRUM-bord uitwerkingsfase
 
**Project:** AI-Assisted Data Visualisation Tool for medical professionals
**Auteur:** Lukas Van Nuffel
**Periode:** 6 mei 2026 → 15 juni 2026 (6 sprints van ±1 week)
**Jury:** 16-17 juni 2026
**Tijdsbudget:** ±20u/week × 5,5 weken = 110u totaal
**Repo:** https://github.com/lukasvannuffel/loupe-datavisualization
**Laatste update:** 2 juni 2026 — LOUPE-27/28/29/30 toegevoegd na review-sessie
 
---
 
## Sprint-planning op hoog niveau
 
| Sprint | Periode | Focus | Geschatte tijd |
|---|---|---|---|
| 1 | 6 → 12 mei | Data layer (parsing, kolomdetectie, mapping, manual picker) | 23u |
| 2 | 13 → 19 mei | AI integratie (Vercel AI Gateway + Claude) + schema delta | 21u |
| 3 | 20 → 26 mei | Chart engine + 2 charts (Bar+errors, Kaplan–Meier) | 20u |
| 4 | 27 mei → 2 juni | 2 charts (Box, XY) + customization + LOUPE-27 (bug fixes) | 21u |
| 5 | 3 → 9 juni | Save/Load + Export + Receipt + LOUPE-28/29/30 | 32u |
| 6 | 10 → 15 juni | Polish + documentatie + demo-prep | 21.5u |
 
**Totaal P0+P1 geschat:** ±138u — Sprint 5 zwaarder door routing-fix (LOUPE-29), loading screen (LOUPE-28), en multi-table detectie (LOUPE-30). Sprint 1 al groter geworden door late toevoeging LOUPE-04b en schema delta op LOUPE-01.
 
---
 
## Epics
 
1. **Data Layer** — CSV/Excel parsing (incl. multi-sheet), kolomtype-detectie, role-mapping
2. **AI Integration** — Vercel AI Gateway, prompt engineering, response validation, transparency preview
3. **Chart Engine** — D3.js renderer + ChartSpec schema
4. **Chart Implementations** — KM, Bar+errors, Box, XY (line/scatter unified)
5. **Customization** — Inline editing, palette, annotations
6. **Persistence** — Supabase schema, save/load, dashboard
7. **Export** — SVG, PNG, reproducibility receipt
8. **Polish & Edge Cases** — Loading/error states, hardening
9. **Documentation** — Productiedossier, technische documentatie, demo
---
 
# SPRINT 1 · 6 → 12 mei
## Data Layer
 
---
 
### LOUPE-01 · ChartSpec schema + types definiëren
 
**Prioriteit:** P0
**Einddatum:** 8 mei 2026 (basis), 13 mei 2026 (schema delta)
**Geschatte tijd:** 3u basis + 2u schema delta = 5u totaal
**Hangt af van:** —
 
**Over project**
Definieer het centrale `ChartSpec` type-systeem dat de hele applicatie zal gebruiken voor visuele configuratie. Dit is de fundering — alles wat hierna komt (renderer, save-format, AI-response, export) hangt hiervan af. Zorg dat het schema uitbreidbaar is zonder breaking changes (denk aan V2 met log-rank/Cox).
 
**Schema-delta na chart-pivot (12 mei 2026):** ROC en Forest plot vervallen uit de MVP-scope op basis van user-research validatie. Box plot en XY plot (unified line/scatter) komen in de plaats. Discriminated-union architectuur blijft — alleen kinds wisselen, base-fields blijven.
 
**Actie-items**
- [x] `src/lib/chartSpec/types.ts` aanmaken met base `ChartSpec` discriminated union
- [x] Sub-types definiëren: `KMSpec`, `BarErrorSpec`, `RocSpec`, `ForestSpec`
- [x] `PlotData` types per chart-type (geaggregeerde waarden, geen rauwe rijen)
- [x] `Receipt` type met velden: `intent`, `recommendation`, `alternatives`, `transformations`, `tests` (open array voor V2)
- [x] Zod schemas voor runtime validation
- [x] Unit test: ChartSpec serialiseert en deserialiseert zonder verlies
- [x] **Delta:** verwijder `RocSpec`, `RocPlotData`, `RocCurve`, `RocPoint` + bijhorende Zod schemas
- [x] **Delta:** verwijder `ForestSpec`, `ForestPlotData`, `ForestRow`, `ForestPooled` + bijhorende Zod schemas
- [x] **Delta:** voeg `BoxSpec` toe (`kind: "box"`, base fields + `showOutliers`, `showMeanMarker`, `notched`)
- [x] **Delta:** voeg `BoxPlotData` toe met `groups: BoxGroup[]` waar `BoxGroup = { label, min, q1, median, q3, max, outliers, n }`
- [x] **Delta:** voeg `XYSpec` toe (`kind: "xy"`, base fields + `mode: "line" | "scatter" | "both"`, `showRegression`, `showErrorBands`)
- [x] **Delta:** voeg `XYPlotData` toe met `series: XYSeries[]` waar `XYSeries = { label, points, regression? }`
- [x] **Delta:** update `ChartSpec` union → `KMSpec | BarErrorSpec | BoxSpec | XYSpec`
- [x] **Delta:** privacy-guard transitief — Box/XY mogen geen `rows`, `patients`, `subjects`, `records` velden bevatten
- [x] **Delta:** vervang Roc/Forest fixtures in tests door Box/XY equivalenten
- [x] **Delta:** downstream cleanup — Roc/Forest references in `chartPreviews.ts`, `Library.tsx`, `Landing.tsx`, `Recommendation.tsx`, `scriptedExchanges.ts`
**Acceptance criteria**
- [x] Alle 4 chart types hebben volledig getypeerde Spec + PlotData
- [x] `pnpm tsc --noEmit` slaagt zonder errors
- [x] Zod schema rejecteert invalid input met duidelijke errors
- [x] Na delta: `ChartSpec['kind']` is exact `"km" | "barError" | "box" | "xy"` (exhaustive check via `expectTypeOf`)
- [x] Na delta: oude `kind: "roc"` en `kind: "forest"` payloads worden expliciet gerejecteerd door Zod
- [x] Privacy-guard rejecteert `{ kind: "box", groups: [{ ..., rows: [...] }] }` en `{ kind: "xy", series: [{ ..., patients: [...] }] }`
---
 
### LOUPE-02 · CSV/Excel parsing in browser
 
**Prioriteit:** P0
**Einddatum:** 10 mei 2026 (basis), 13 mei 2026 (multi-sheet uitbreiding)
**Geschatte tijd:** 6u basis + 2u multi-sheet = 8u totaal
**Hangt af van:** LOUPE-01
 
**Over project**
Wire de bestaande dropzone in `/upload` aan een echte client-side parser. Dit is je privacy-pillar in de praktijk — geen enkele rij data mag de browser verlaten. PapaParse voor CSV, SheetJS voor XLSX. Medische Excel-bestanden bevatten vaak meerdere tabbladen (raw data + codebook + derived variables, of één sheet per treatment arm). Stilzwijgend de eerste sheet pakken is een trust-killer voor je doelgroep — bouw expliciete sheet-selectie in.
 
**Actie-items**
- [x] `papaparse` en `xlsx` (SheetJS) installeren
- [x] Hook `useFileParser` in `src/lib/parser/useFileParser.ts`
- [x] CSV-parsing met PapaParse (header detection, type inference disabled — komt in LOUPE-03)
- [x] XLSX-parsing met SheetJS (eerste sheet, header row)
- [x] File size guard (max 50MB conform design system)
- [x] Error states: corrupt file, encoding issues, geen kolommen
- [x] Geheugen-veilig: parse in worker als file > 5MB
- [x] **Multi-sheet detectie:** als XLSX > 1 sheet, return lijst van sheet-namen + row count per sheet zonder volledige parse
- [x] **Sheet selector UI** in `/upload`: segmented control (≤4 sheets) of dropdown (>4), default eerste sheet
- [x] **Lazy parse:** parse alleen volledige inhoud van geselecteerde sheet
- [x] **Sheet-switch flow:** wisselen reset column mapping (LOUPE-04) — confirmation dialog bij verlies
- [x] **Edge case:** XLSX met 1 sheet → skip selector UI, ga direct door
- [x] **Edge case:** XLSX met enkel lege sheets → expliciete `EmptyWorkbookError`
**Acceptance criteria**
- [x] CSV met 10k rijen parseert zonder UI-block
- [x] XLSX met dezelfde data geeft identieke kolommen
- [x] File > 50MB toont expliciete fout, geen crash
- [x] Network tab toont GEEN POST request — privacy intact
- [x] XLSX met 3 sheets toont selector met namen + row counts, default eerste sheet geselecteerd
- [x] Sheet wisselen herparseert correct, kolomdetectie (LOUPE-03) draait opnieuw
- [x] XLSX met 1 sheet skipt selector — geen onnodige UI-stap
---
 
### LOUPE-03 · Kolomtype auto-detectie
 
**Prioriteit:** P0
**Einddatum:** 11 mei 2026
**Geschatte tijd:** 5u
**Hangt af van:** LOUPE-02
 
**Over project**
Detecteer per kolom welk type het is — numeriek, categorisch, datum, binair, time-to-event. Deze inferentie is wat je AI later helpt om realistische chart-aanbevelingen te doen. Geef per kolom ook een confidence-score zodat de UI dubbelzinnige kolommen kan markeren.
 
**Actie-items**
- [x] `src/lib/parser/inferColumnTypes.ts` — pure functie, makkelijk te testen
- [x] Detector voor: `numeric`, `integer`, `categorical`, `binary`, `date`, `datetime`, `time-to-event`
- [x] Heuristieken: kolomnaam ("time", "event", "survival") + waarden-patroon
- [x] Confidence score 0-1 per detectie
- [x] Sample size: detect op eerste 1000 rijen voor performance
- [x] Display in `/upload` UI: badge per kolom met type + confidence
- [x] Unit tests met fixtures voor de 7 types
**Acceptance criteria**
- [x] Een testfile met patient-data toont: `id` (categorical), `time_to_event_months` (numeric → time-to-event), `event_observed` (binary), `treatment_arm` (categorical)
- [x] Kolom met < 50% confidence krijgt visuele indicator dat user moet bevestigen
- [x] False positives onder 10% op de testset
---
 
### LOUPE-04 · Column-to-role mapping logica
 
**Prioriteit:** P0
**Einddatum:** 12 mei 2026
**Geschatte tijd:** 6u
**Hangt af van:** LOUPE-03
 
**Over project**
Hook `/upload/map` aan echte data. Per chart type heeft elke "role" specifieke type-eisen (KM time-as moet numeriek zijn, event-status moet binair). Valideer dit en blokkeer doorgang als mapping incompleet/onjuist is.
 
**Actie-items**
- [x] `ROLE_REQUIREMENTS` map per chart type (welke roles, welke types geaccepteerd)
- [x] Auto-mapping op basis van kolomnamen + types ("time" → KM time-as)
- [x] UI: dropdowns per role met enkel compatibele kolommen
- [x] Validatie: required roles ingevuld + geen dubbele assignments
- [x] State management via bestaande `useAppState` provider
- [x] "Continue to recommendation" knop disabled tot mapping geldig
- [x] Heldere error-messages bij type-mismatch
**Acceptance criteria**
- [x] Bij KM-flow: gebruiker krijgt automatisch suggestie voor time + event kolom
- [x] User kan suggestie overriden, dropdown toont alleen geldige opties
- [x] Met incomplete mapping is "Continue" disabled — geen runtime crash mogelijk
---
 
### LOUPE-04b · Manual chart picker route
 
**Prioriteit:** P0
**Einddatum:** 13 mei 2026
**Geschatte tijd:** 3u basis + 0.5u content-update na chart-pivot = 3.5u totaal
**Hangt af van:** LOUPE-04
 
**Over project**
Niet elke medische professional wil door een AI-aanbeveling heen. Een onderzoeker die exact weet dat hij een Kaplan–Meier curve nodig heeft, moet niet gedwongen worden eerst een intent in te tikken voor een AI-call. Dit positioneert je product als "AI als assistent" in plaats van "AI als poortwachter" — cruciaal voor adoptie én een gracefull fallback bij AI-failure. Na column mapping krijgt de gebruiker een keuze tussen aanbevolen flow (LOUPE-07) of directe chart-selectie.
 
**Actie-items**
- [x] Decision step tussen `/upload/map` en `/recommend` met twee gelijkwaardige CTA's
- [x] Manual picker view `/recommend/manual` met 4 chart cards
- [x] Compatibiliteits-check: filter / disable chart types waarvoor de huidige mapping geen valide roles oplevert
- [x] Pure helper `getCompatibility(mapping, ROLE_REQUIREMENTS)` voor testbaarheid
- [x] State management: gekozen `chartType` direct in `ChartSpec`, skip AI-recommendation call
- [x] Receipt update: vermeld expliciet "User selected chart type manually (no AI recommendation requested)"
- [x] Mode-switch safety net: switchen tussen AI en manual verliest geen mapping of intent
- [x] **Content-update na chart-pivot:** kaart 3 vervangen ROC → Box plot
- [x] **Content-update na chart-pivot:** kaart 4 vervangen Forest → XY plot
- [x] **Update role-requirements helper:** Box (numeric value + categorical group), XY (numeric x + numeric y, optionele group)
**Acceptance criteria**
- [x] Vanaf `/upload/map` is de keuze AI vs. manual zichtbaar en gelijkwaardig gepresenteerd
- [x] Manual picker toont enkel chart types die compatibel zijn met huidige column mapping
- [x] Manual route maakt GEEN AI-call — verifieerbaar in Network tab
- [x] Receipt van een manueel gekozen chart vermeldt afwezigheid van AI-aanbeveling
- [x] User kan vanaf manual flow alsnog later naar AI-aanbeveling switchen zonder data te verliezen
- [x] Na content-update: picker toont KM, Bar+errors, Box, XY — geen ROC of Forest
- [x] Incompatibele kaarten tonen correcte "needs columns mapped to…" messages op basis van nieuwe role-requirements
---
 
# SPRINT 2 · 13 → 19 mei
## AI Integration
 
---
 
### LOUPE-05 · Vercel AI Gateway + Anthropic setup
 
**Prioriteit:** P0
**Einddatum:** 14 mei 2026
**Geschatte tijd:** 3u
**Hangt af van:** —
 
**Over project**
Setup van de AI-laag. Vercel AI Gateway zit voor je Anthropic-calls — dit geeft je rate limiting, observability, en optie om later van model te wisselen zonder code-changes. Alle env vars moet je toevoegen aan Vercel én lokaal.
 
**Actie-items**
- [x] `ai` SDK + `@ai-sdk/anthropic` installeren
- [x] Vercel AI Gateway configureren in dashboard
- [x] Env vars toevoegen: `AI_GATEWAY_API_KEY`, `ANTHROPIC_MODEL` (claude-sonnet-4)
- [x] Test endpoint `/api/ai/ping` om verbinding te valideren
- [x] Setup-stap in README documenteren
- [x] AI Gateway logging dashboard verifiëren
**Acceptance criteria**
- [x] `curl /api/ai/ping` geeft een geldige Claude response
- [x] Calls verschijnen in Vercel AI Gateway dashboard
- [x] Geen API keys gecommit naar repo
---
 
### LOUPE-06 · Recommendation prompt + response schema
 
**Prioriteit:** P0
**Einddatum:** 17 mei 2026
**Geschatte tijd:** 8u (was 7u, +1u voor transparency preview en PHI-warning)
**Hangt af van:** LOUPE-05, LOUPE-01
 
**Over project**
Het hart van je product. De prompt neemt de kolom-schema (geen waarden!) + intent in plain language, en moet teruggeven: aanbevolen chart_type, redenering, 1-2 alternatieven met motivatie, en welke transformaties op de data nodig zijn. **Privacy-kritisch:** stuur NOOIT rijen mee. Voeg een transparency preview toe vóór de eerste AI-call — gebruikers moeten exact kunnen zien wat hun browser verlaat. Dit is verifieerbare privacy, geen marketing-claim.
 
**Actie-items**
- [x] `src/lib/ai/recommendChart.ts` — server action met streaming response
- [x] Prompt template in `src/lib/ai/prompts/recommend.ts` — system + user
- [x] Zod schema voor structured output (`generateObject` van AI SDK)
- [x] Response velden: `chartType`, `confidence`, `reasoning`, `alternatives[]`, `transformations[]`
- [x] **Whitelist:** `chartType` MUST be one of `"km" | "barError" | "box" | "xy"` — geen ROC, Forest, Violin, of Bland–Altman
- [x] Per chart-type explicit "when to use" guidance in system prompt
- [x] Privacy-assert: payload mag enkel kolomnamen + types + intent bevatten — log error in dev als gebroken
- [x] **Transparency preview:** uitklapbaar paneel vóór "Get recommendation" knop dat JSON-payload toont (kolomnamen + types + intent)
- [x] **Disclosure tekst:** "Geen waarden of rijen verlaten je browser. Wel: kolomnamen, types, en je intent."
- [x] **PHI-warning:** als kolomnaam matched op regex (`name`, `dob`, `initials`, `mrn`, `patient_id`, etc.), toon inline warning met rename-optie vóór call
- [x] Token-count logging voor budget tracking
- [x] Fallback bij AI-failure: verwijs naar manual picker (LOUPE-04b) én `/library`
**Acceptance criteria**
- [x] Test-call met "Compare 5-year survival between treatment arms" → returns `chartType: "km"` met geldige reasoning
- [x] Test-call met "comparison of biomarker distributions across stages" → returns `chartType: "box"`
- [x] Test-call met "tumor size over treatment cycles" → returns `chartType: "xy"` mode line
- [x] AI-response met `chartType` buiten de 4 toegestane → Zod-validatie faalt expliciet
- [x] Test-call met conflicterende intent → returns alternatives met scherpe motivatie
- [x] Privacy-assert in test: gemockte payload met data-rijen triggert error
- [x] Per call < 0.05 EUR (voor budget van 50 EUR over project)
- [x] Transparency preview toont identieke JSON aan wat daadwerkelijk over de draad gaat (verifieerbaar in Network tab)
- [x] PHI-verdachte kolomnaam triggert duidelijke warning vóór call kan starten
---
 
### LOUPE-07 · /recommend wire aan echte AI
 
**Prioriteit:** P0
**Einddatum:** 18 mei 2026
**Geschatte tijd:** 6u
**Hangt af van:** LOUPE-06, LOUPE-04
 
**Over project**
Vervang de hardcoded `RECOMMEND_COPY` in `Recommendation.tsx` door echte AI-output. Behoud de bestaande UI-fasen (intent dissolves → chart appears) maar drive ze nu door echte streaming response.
 
**Actie-items**
- [x] `Recommendation.tsx` refactor: useState → useChat / useObject hook
- [x] Loading state: ring-loader animatie tijdens API-call
- [x] Error state: vriendelijke fallback met "try again" + verwijzing naar /library én manual picker
- [x] Caching: zelfde intent + schema → geen nieuwe API-call (sessionStorage)
- [x] Phase-animaties hookups op streaming events
- [x] Receipt-data accumuleren tijdens response
**Acceptance criteria**
- [x] Echte CSV → echte AI-aanbeveling → correct chart type gerenderd
- [x] Bij netwerkfout: geen crash, gebruiker krijgt actie-optie
- [x] Tweede call met identieke input is instant (cache hit)
---
 
### LOUPE-08 · Override-flow met echte chart-switch
 
**Prioriteit:** P1
**Einddatum:** 19 mei 2026
**Geschatte tijd:** 3u
**Hangt af van:** LOUPE-07
 
**Over project**
`RecommendationOverride` shell bestaat al. Hook hem aan echte chart-switching, en update de Receipt om de override te registreren ("user overrode KM in favor of box plot, original AI reasoning preserved").
 
**Actie-items**
- [x] `onSelect` propagatie naar app state
- [x] Receipt update: append override-event met timestamp + originele aanbeveling
- [x] Visuele indicator op chart: "Overridden by you"
- [x] Re-render check zonder full reload
**Acceptance criteria**
- [x] User kiest Box in plaats van KM → chart switcht zonder reload
- [x] Receipt vermeldt expliciet de override
---
 
### LOUPE-09 · AI cost-guardrails
 
**Prioriteit:** P0
**Einddatum:** 19 mei 2026
**Geschatte tijd:** 2u
**Hangt af van:** LOUPE-05
 
**Over project**
Met budget van 50 EUR moet je voorkomen dat een testflow per ongeluk 100 calls doet. Bouw rate-limiting per user en kost-tracking in.
 
**Actie-items**
- [x] Rate limit: max 20 recommendation-calls per user per uur (Supabase tabel)
- [x] Token budget per call: max input 5k tokens (truncate intent als langer)
- [x] Server-side counter: totale tokens per dag (gewoon log lijn)
- [x] AI Gateway cost-cap configureren
**Acceptance criteria**
- [x] 21e call binnen een uur retourneert duidelijke "rate limited" message
- [x] Budget kan in dashboard van AI Gateway gevolgd worden
---
 
# SPRINT 3 · 20 → 26 mei
## Chart Engine + Eerste Charts
 
---
 
### LOUPE-10 · D3 + ChartRenderer dispatcher
 
**Prioriteit:** P0
**Einddatum:** 21 mei 2026
**Geschatte tijd:** 4u
**Hangt af van:** LOUPE-01
 
**Over project**
Bouw de centrale `ChartRenderer` component die een ChartSpec + PlotData neemt en de juiste chart-implementatie kiest. Gebruik D3 modules selectief om bundle-grootte te beperken. Test compatibiliteit met React 19 + React Compiler — geen onnodige useMemo/useCallback.
 
**Actie-items**
- [ ] Installeer enkel benodigde D3 modules: `d3-selection`, `d3-scale`, `d3-shape`, `d3-array`, `d3-axis`
- [ ] `ChartRenderer.tsx`: switch op `spec.kind`, dispatcht naar implementatie
- [ ] Shared utilities: `useResizeObserver`, `applyAxes`, `applyDesignTokens`
- [ ] Compiler-check: build met React Compiler aan, geen runtime warnings
- [ ] Smoke test met simpele bar-chart om architectuur te valideren
**Acceptance criteria**
- [ ] Bundle delta van D3 onder 35kB gzipped
- [ ] Renderer reageert op container-resize zonder gestottter
- [ ] React Compiler optimaliseert correct, geen onnodige re-renders zichtbaar in Profiler
---
 
<### LOUPE-11 · Bar chart met error bars
 
**Prioriteit:** P0
**Einddatum:** 23 mei 2026
**Geschatte tijd:** 6u
**Hangt af van:** LOUPE-10
 
**Over project**
Begin met de simpelste chart — valideert je hele architectuur (data → spec → renderer → SVG). Render uit `[{label, mean, sd, n}]`. Toggle tussen SD/SEM/CI95. Match design system: hairlines, Source Serif titels, geen kleurig overload.
 
**Actie-items**
- [x] `BarErrorChart.tsx` component
- [x] X-as: categorisch met label-rotation bij overflow
- [x] Y-as: numeriek met smart tick selection
- [x] Error-bar berekening: SD direct, SEM = SD/√n, CI95 = mean ± t(0.975, n-1) × SD/√n
       (t-distribution; 1.96·SEM is wrong for small n — see post-review fix.)
- [x] Toggle in customization rail (later in LOUPE-15)
- [x] Inline-editable titel via `contentEditable` zoals huidig prototype
- [x] Aggregator functie: rauwe rijen → `[{label, mean, sd, n}]`
**Acceptance criteria**
- [x] Render uit echte aggregaties van CSV
- [x] Error-type toggle wisselt zonder re-aggregate
- [x] Visueel match met design system mockups
---
 
### LOUPE-12 · Kaplan–Meier curve
 
**Prioriteit:** P0
**Einddatum:** 26 mei 2026
**Geschatte tijd:** 10u
**Hangt af van:** LOUPE-10
 
**Over project**
De moeilijkste van je MVP. Step-functie berekenen client-side, censoring tick marks tonen, at-risk tabel onder de chart. **Geen log-rank, geen p-waarde** — niet claimen wat je niet berekent. Multiple groups via palette. Twee respondenten (R3 en R4) noemden expliciet KM zónder at-risk/censoring als pijnpunt — dit is je hero-chart.
 
**Actie-items**
- [x] `kaplanMeier.ts` — pure functie: rauwe rijen `[{time, event, group}]` → step points per groep
- [x] Stappenformule: S(t) = ∏(1 - dᵢ/nᵢ) over events tot t
- [x] Censoring detectie + tick-marks op de curve
- [x] At-risk tabel: aantal patiënten in risk set bij elke major time-point
- [x] `KaplanMeierChart.tsx` met multi-group support
- [x] Edge cases: alle censored, zero events, single group
- [x] Privacy-check: PlotData bevat `[{t, survival, nAtRisk, censored}]` per groep, GEEN per-patient data
**Acceptance criteria**
- [x] Test fixture met bekende KM-curve (Lung cancer dataset uit `survival` R-package) reproduceert visueel correct
- [x] At-risk tabel telt correct af bij elke time-point
- [x] PlotData JSON heeft geen veld dat individuele patiënten kan re-identificeren
- [x] Censoring ticks zichtbaar maar niet dominant
---
 
# SPRINT 4 · 27 mei → 2 juni
## Tweede Chart-batch + Customization
 
---
 
### LOUPE-13 · Box plot
 
**Prioriteit:** P0
**Einddatum:** 29 mei 2026
**Geschatte tijd:** 5u
**Hangt af van:** LOUPE-10
 
**Over project**
Vervangt het oorspronkelijke ROC-ticket na chart-pivot. Box plot is de canonische distributievergelijking in clinical publications — sterker dan violin voor jouw doelgroep omdat reviewers en oudere clinicians de vorm zonder uitleg lezen, en omdat box plots betrouwbaar blijven bij kleine N (waar KDE in een violin misleidend zou worden). Compute is goedkoop: quartielen + Tukey-fences voor outliers. Geen significantie-test, geen p-waarde — net zoals KM houd je je aan "wat je niet berekent, claim je niet".
 
**Actie-items**
- [x] `boxPlot.ts` — pure functie: rauwe rijen `[{value, group}]` → `[{label, min, q1, median, q3, max, outliers, n}]` per groep
- [x] Quartielberekening via interpolatie (consistent met R `type=7` default — documenteer in code-comment)
- [x] Outlier-detectie: Tukey-fences (waarden buiten `q1 - 1.5*IQR` en `q3 + 1.5*IQR`)
- [x] `BoxChart.tsx` component met multi-group support
- [x] Whiskers tot min/max binnen Tukey-fences; outliers als losse markers
- [x] Optioneel: mediaan-notch (visualiseert 95% CI rondom mediaan) — controle via `notched` in spec
- [x] Optioneel: mean-marker (extra dot binnen box) — controle via `showMeanMarker`
- [x] Edge cases: n=1 per groep (geen box, alleen punt), alle waardes identiek (vlakke lijn op één hoogte), één lege groep
- [x] Privacy-check: PlotData bevat 5-number summary + outliers, GEEN volledige rij-data
**Acceptance criteria**
- [x] Test fixture (bv. `iris` Sepal.Width per Species) reproduceert quartielen identiek aan R's `boxplot()`
- [x] Outliers visueel zichtbaar, niet samengevoegd met whiskers
- [x] Met `notched: true`: notch zichtbaar wanneer 95% CI rondom mediaan binnen de box past
- [x] PlotData JSON: geen `rows`, geen patient-keys, alleen aggregaten + outlier-waarden
- [x] Visueel match met design system: hairlines, geen kleur-overload, mono labels op assen
---
 
### LOUPE-14 · XY plot (line/scatter unified)
 
**Prioriteit:** P0
**Einddatum:** 1 juni 2026
**Geschatte tijd:** 7u
**Hangt af van:** LOUPE-10
 
**Over project**
Vervangt het oorspronkelijke Forest-ticket na chart-pivot. Twee gebruiksvormen in één primitive: longitudinaal verloop (mean per visit per arm) en correlatie tussen twee continue variabelen. Mode-toggle (`line | scatter | both`) bepaalt rendering zonder data te hertransformeren. Optioneel: lineaire regressielijn voor scatter, error-bands voor line. Dit is je dekking voor "trend over time" en "correlation" — twee use cases die in elk klinisch artikel terugkomen.
 
**Actie-items**
- [x] `xyPlot.ts` — pure functie: rauwe rijen `[{x, y, group?}]` → `[{label, points: [{x, y}]}]` per groep
- [x] Optionele regressie-helper: `computeLinearRegression(points)` → `{slope, intercept, r2}` via ordinary least squares
- [x] Optionele aggregator voor longitudinaal: rauwe rijen `[{visit, value, patientId, group}]` → mean per visit per groep met SD/SEM voor error-bands
- [x] `XYChart.tsx` met `mode` switch (line / scatter / both)
- [x] **Line mode:** smooth lijnen (D3 `curveMonotoneX`), optioneel error-bands als semi-transparent gevulde area
- [x] **Scatter mode:** punten op coordinaten, optioneel regressielijn over volledige x-range
- [x] **Both mode:** lijn door points + zichtbare punten op de lijn
- [x] Multi-group support: kleurpalet uit design system, dashed alternatief voor B-arm (consistent met KM-conventie)
- [x] Edge cases: één punt per groep, alle x-waardes identiek, single group, regressie op n<3 (skip, toon warning in receipt)
- [x] Privacy-check: PlotData bevat aggregaten of paired (x,y) observations — geen patient-IDs of indexeerbare keys
**Acceptance criteria**
- [x] Line mode: longitudinale fixture (mean per cycle per arm) rendert correct met optionele SEM-bands
- [x] Scatter mode: bivariate fixture rendert met regressielijn + r² annotatie wanneer `showRegression: true`
- [x] Both mode: lijn + punten tegelijk zichtbaar, geen visuele clutter
- [x] Regressie-output binnen ±0.001 van bekende OLS-implementatie (bv. `scipy.stats.linregress` op iris)
- [x] PlotData JSON: geen `patientId`, `subjectId`, of vergelijkbare indexeerbare velden
---
 
### LOUPE-15 · Customization rail
 
**Prioriteit:** P0 (basis) / P1 (annotaties)
**Einddatum:** 2 juni 2026
**Geschatte tijd:** 6u
**Hangt af van:** LOUPE-11
 
**Over project**
De rechter rail in `/export`. Begin met de basis (P0): titel, axis-labels, palette. Annotaties (P1: tekstlabels op chart) zijn nice-to-have.
 
**Actie-items**
- [x] **P0:** Inline-editable titel + axis-labels (contentEditable)
- [x] **P0:** 3 medische palettes: monochrome, divergent (bv. lancet), categorical
- [x] **P0:** Live preview update bij wijziging zonder re-aggregate
- [x] **P0:** Box-specifieke toggles: `showOutliers`, `notched`, `showMeanMarker`
- [x] **P0:** XY-specifieke toggles: `mode` (line/scatter/both), `showRegression`, `showErrorBands`
- [x] **P1:** Annotatie-tool: klik op chart → text-label toevoegen, drag te repositioneren
- [x] **P1:** Error-bar type toggle (SD/SEM/CI) voor BarError chart
- [x] State serialiseert in ChartSpec voor save
**Acceptance criteria**
- [x] Wijzigingen reflecteren in <100ms zonder data re-fetch
- [x] ChartSpec na save bevat alle customizations
---
 
### LOUPE-27 · Customize guard + export/error.tsx
 
**Prioriteit:** P0
**Einddatum:** 2 juni 2026
**Geschatte tijd:** 3u
**Hangt af van:** —
 
**Over project**
Bug-familie rond onvolledige mappings. Een gebruiker kon op `/export` belanden zonder gerenderde chart (mapping incomplete of incompatibel met chartkind), wat in jury-context fataal is. Tegelijk ontbrak een `error.tsx` op het `/export` route segment — de hele app had nul error boundaries, dus elke render-throw viel door naar de generieke Next.js overlay.
 
Twee fixes, één ticket:
1. Op `/recommend`: als er geen chart gerenderd is (mapping incomplete / `chartSpec` of render-guard null), dan Customize disabled + duidelijke inline error in plaats van een button die naar een gebroken `/export` leidt.
2. Op `/export`: route-level `error.tsx` met retry + terug-naar-`/recommend` action, zodat een onverwachte throw niet de demo opblaast.
**Actie-items**
- [x] `Recommendation.tsx` — afleiden `canCustomize = chartSpec !== null && mapping valid`; Customize-button `disabled` + `aria-disabled` + tooltip "Complete the column mapping first"
- [x] `canCustomize.ts` — pure helper geëxtraheerd voor testbaarheid; asymmetrie km/box/xy vs barError gedocumenteerd in comment
- [x] `RecommendationMappingAlert.tsx` — inline `role="alert"` boven chart-area als render mislukt door missing mapping; copy "Mapping incomplete — return to column mapping" + link naar `/upload/map`; toont pas na phase >= 2 (geen flash tijdens reveal-animatie)
- [x] Phase-gate fix: alert alleen tonen na `phase >= 2` om false positive te vermijden tijdens 700ms chart-reveal
- [x] `src/app/export/error.tsx` — Next.js error segment; Eyebrow + primaire `reset`-action + secondary "Back to recommendation"; `onClick={reset}` (geen router.push als primaire)
- [x] `src/app/export/page.tsx` — defensieve guard: als geen geldige `chartSpec` resolved na hydration, redirect naar `/recommend` met toast (geen lege `/export` state); guard gebailout als `chartKind !== null && dataset !== null` (spec rebuild pad)
- [x] Recommendation.tsx extractie: component teruggebracht naar ≤ 220 regels via extractie naar `Recommendation/` sibling-files
- [x] Unit test `Recommendation.canCustomize.test.tsx`: `liveSpec=null` → button disabled + alert zichtbaar; enabled pad gedekt
- [x] E2E-pad: forceer mapping zonder verplichte rol → geen navigatie naar `/export`
**Acceptance criteria**
- [x] Customize-knop visueel + functioneel disabled wanneer chart niet rendert
- [x] Klik op disabled Customize triggert geen navigatie
- [x] Throw in `/export` tree wordt opgevangen door `error.tsx`, niet door Next.js default overlay
- [x] `error.tsx` reset-action herstelt de pagina zonder full reload (verifieerbaar via tijdelijke throw in Export.tsx)
- [x] Geen mapping-alert flash tijdens chart-reveal animatie (phase-gate)
**Review-bevindingen (opgelost)**
- Critical: mapping-alert flash op valid demo tijdens phase < 2 → opgelost via phase-gate
- Critical: export guard blokkeerde spec rebuild (chartKind + dataset aanwezig) → opgelost via bail-out conditie
- Recommendation.tsx was 339 regels (budget ≤ 220) → opgelost via extractie naar sibling-bestanden
---
 
# SPRINT 5 · 3 → 9 juni
## Persistence + Export
 
---
 
### LOUPE-16 · Supabase charts schema + RLS
 
**Prioriteit:** P0
**Einddatum:** 4 juni 2026
**Geschatte tijd:** 3u
**Hangt af van:** —
 
**Over project**
SQL-migratie voor de charts-tabel. Eén tabel, JSONB voor flexibiliteit, RLS voor isolatie tussen users.
 
**Actie-items**
- [x] Migratie-bestand `supabase/migrations/YYYYMMDD_charts.sql`
- [x] Tabel `public.charts` met velden uit eerdere brief
- [x] RLS policy: `auth.uid() = user_id` voor select/insert/update/delete
- [x] Index op `user_id` voor dashboard-query
- [x] Trigger voor `updated_at`
- [x] Test in Supabase studio: user A kan charts van user B niet zien
**Acceptance criteria**
- [x] `supabase db reset` past schema clean toe
- [x] Dual-account test bewijst RLS-isolatie
On export, source the title from ChartSpec.title, NOT from overrideDisplay.title. The · overridden from X suffix is page-UI-only and must not appear in exported artifacts.
---
 
---
 
### LOUPE-29 · Wizard routing fix — /recommend/choose als verplichte tussenstap
 
**Prioriteit:** P0
**Einddatum:** 2 juni 2026
**Geschatte tijd:** 2u
**Hangt af van:** —
 
**Over project**
`CLAUDE.md` documenteerde de wizard-flow als `/upload → /upload/map → /recommend/choose → /recommend (AI) of /recommend/manual → /export`. In productie sprong `/upload/map` rechtstreeks naar `/recommend`, waardoor `/recommend/choose` overgeslagen werd en de manual-pad alleen via diepe URL bereikbaar was. Mismatch tussen architectuurdoc en realiteit — zichtbaar als jury docs naast demo legt.
 
Fix: na `/upload/map` Continue → `router.push('/recommend/choose')`. AI-call verhuist van UploadMap naar `useRecommendation` gemount in `RecommendationAiPending` (via RecommendGate), getriggerd pas na keuze "AI" op `/recommend/choose`.
 
**Actie-items**
- [x] `UploadMap.tsx` — Continue-handler navigeert naar `/recommend/choose`; `useRecommendation` hook ontkoppeld van UploadMap
- [x] `useRecommendation` — zelfde hook, nieuw mount-punt in `RecommendationAiPending`; gated op `selectionMode === "ai" && hydrated && intent && mapping && dataset && mappingValid`
- [x] `validateMapping` in shouldRecommend gate — voorkomt AI-call bij invalide mapping (budget + privacy)
- [x] `/recommend/choose/page.tsx` — CTA's geverifieerd: "Get AI recommendation" → `setSelectionMode("ai")` + `router.push('/recommend')`, "Choose manually" → `setSelectionMode("manual")` + `router.push('/recommend/manual')`; stale receipt/chartKind gecleard op AI-pad
- [x] `/recommend/page.tsx` en `/recommend/manual/page.tsx` — deep-link guard: als `intent`/`dataset`/`mapping` ontbreken na hydration → redirect naar `/upload`
- [x] isRunningRef in `useRecommendation` — in-flight dedup voorkomt double-fire bij re-renders en React StrictMode
- [x] `CLAUDE.md` — mount-site sentence bijgewerkt: `useRecommendation` gemount in `RecommendGate.tsx` via `RecommendationAiPending`
- [x] Tests: `UploadMap.routing.test.tsx` bijgewerkt (Continue → `/recommend/choose`, geen recommendChart call); `RecommendationAiCall.test.tsx` nieuw (AI gate, manual gate, hydration gate, mapping validity gate)
- [x] sessionStorage cache-key ongewijzigd — identieke inputs → identieke hash → cache-hit intact
**Acceptance criteria**
- [x] `/upload/map` → Continue → landt op `/recommend/choose`, niet `/recommend`
- [x] AI-pad: één `recommendChart` server action, geen double-fire
- [x] Manual-pad: geen AI-call (verifieerbaar in Network tab)
- [x] Deep-link `/recommend` zonder mapping → redirect naar `/upload`
- [x] Tweede AI-call met identieke input is cache-hit (geen network POST)
**Review-bevindingen (opgelost)**
- Critical: `useRecommendation` nog aanwezig in UploadMap na fix → opgelost
- Critical: `selectionMode` niet gezet vóór navigatie vanuit `/recommend/choose` → opgelost; beide CTAs zetten selectionMode synchroon vóór push
- Critical: `shouldRecommend` miste `validateMapping` check → opgelost
- Critical: hydration-test was tautologisch → herschreven; mapping-validity test toegevoegd
---
 
### LOUPE-28 · Analyzing loading screen tussen /upload/map en /recommend
 
**Prioriteit:** P0
**Einddatum:** 3 juni 2026
**Geschatte tijd:** 4u
**Hangt af van:** LOUPE-29
 
**Over project**
De loading state was enkel een `RingLoader` in de Continue-button van `/upload/map`. Tijdens de server action (5–15s) zag de gebruiker geen visuele voortgang. Vervangen door een full-screen "Analyzing" view die de loupe-metafoor expliciet maakt: een veld ruwe datapunten waaruit een KM-curve emergeert naarmate de lens beweegt.
 
Ontwerp was canvas-based. Na LOUPE-29 wordt `/recommend` het natuurlijke punt waar de AI-call afvuurt. Initieel plan was `app/recommend/loading.tsx` (Next.js loading segment) — na implementatie gekozen voor mount via `RecommendationAiPending` omdat de segment-loader ook zou vuren op `/recommend/choose` en `/recommend/manual` (geen AI-paden). Bewuste architectuurafwijking, gedocumenteerd in productiedossier.
 
**Actie-items**
- [x] `src/components/loading/Analyzing.tsx` — canvas component; ≤ 160 regels; geen progress bar, geen timer, geen navigate prop
- [x] `src/components/loading/Analyzing.draw.ts` — pure canvas draw-functies geëxtraheerd; lens-interactie, idle-drift, reveal-trail, finished flourish
- [x] Prototype gestripped: `BASE` timer, `navigate` call, `setProgress`/`pct` text verwijderd — animatie is volledig indeterminate
- [x] Hint-cycling: 3 strings op 3000ms interval ("Reading column structure…", "Matching chart patterns…", "Almost there…"); `clearInterval` in useEffect cleanup
- [x] Kleuren via `getComputedStyle` op mount (niet per frame): `--color-amber`, `--color-ink`, `--color-paper-card`; geen hex-literals in JS/TSX
- [x] `prefers-reduced-motion`: statische lens-pose via `drawStaticPose()`, geen rAF loop, hint-tekst zichtbaar
- [x] DPR cap op 2 (laptopperformance)
- [x] ResizeObserver op wrap-element (niet `window.resize`) voor correcte canvas-resize bij layout-shifts
- [x] `aria-hidden="true"` op canvas (decoratief)
- [x] CSS-tokens in `app/globals.css`: `.analyzing-page` (position: fixed; inset: 0), `.analyzing-top`, `.analyzing-field`, `.analyzing-canvas`, `.analyzing-hint`
- [x] `app/recommend/loading.tsx` — aangemaakt en vervolgens verwijderd; `Analyzing` gemount in `RecommendationAiPending` voor correcte route-scoping
- [x] Unit tests: mount zonder crash (JSDOM canvas mock), reduced-motion pad start geen rAF, positief rAF pad start wel, clearInterval bij unmount
**Acceptance criteria**
- [x] Navigatie van `/recommend/choose` (AI-keuze) naar `/recommend` toont Analyzing view tot streaming response klaar is
- [x] Loader unmount automatisch wanneer `/recommend` data resolved
- [x] `/recommend/choose` en `/recommend/manual` tonen Analyzing NIET (correcte route-scoping)
- [x] `prefers-reduced-motion: reduce` schakelt canvas-animatie uit zonder breuk
- [x] Geen `setInterval`/rAF leakage na route-change (DevTools Performance)
- [x] Screenshots bij 1440px en 380px in productiedossier
**Review-bevindingen (opgelost)**
- Spec-afwijking: `loading.tsx` verwijderd (bewuste keuze) — gedocumenteerd in productiedossier als architectuurverbetering
- ResizeObserver vervangen `window.addEventListener("resize")` → Fix geïmplementeerd
- Positieve rAF-test ontbrak → toegevoegd met mutation-verify
---
 
### LOUPE-30 · Multi-table-in-één-sheet detectie + blocker
 
**Prioriteit:** P1
**Einddatum:** 4 juni 2026
**Geschatte tijd:** 4u
**Hangt af van:** LOUPE-02
 
**Over project**
LOUPE-02 dekt meerdere sheets in een workbook. Dit ticket dekt het andere geval: één sheet bevat meerdere tabellen naast of onder elkaar — typisch in trial-spreadsheets ("Cohort A" links, "Cohort B" rechts gescheiden door lege kolom; of stacked tables met header rows in het midden). De parser pakte stilzwijgend de eerste rij als header en mangelde de rest tot junk-rijen, wat downstream resulteerde in PHI-warnings op valide kolommen of onzin-mappings.
 
Niet automatisch oplossen — opschoning hoort bij de gebruiker. Detecteren en blokkeren met duidelijke instructie. Onderzoeksrapport bevestigt dit: respondenten verwachten dat de tool eerlijk zegt wanneer data niet bruikbaar is, niet stilzwijgend mangling.
 
**Heuristieken** (alle ná `parseWorkbookToResult`, op de geparste AoA):
- **horizontal_split:** ≥2 niet-aaneensluitende clusters van ≥2 non-empty header cells, gescheiden door interior gap-kolommen (trailing empties tellen niet)
- **embedded_header:** body-rij met ≥50% non-numeric cells die verschilt van header-rij (≥2 cellen anders) — full scan met early-exit op eerste match
- **sparse header cluster:** header-rij heeft >30% interior-empty cells én ≥2 clusters van ≥2 non-empty cells (fallback als horizontal_split niet vuurde)
**Actie-items**
- [ ] `src/lib/parser/detectMultiTable.ts` — pure functie `detectMultiTable(aoa): MultiTableDetection`; zero React/DOM imports; early-exit op eerste positieve signaal
- [ ] Return type: `{ detected: true; reason: "horizontal_split" | "embedded_header"; hint: string } | { detected: false }`
- [ ] Aanroep vanuit `parseWorkbookToResult` ná header-detectie, vóór `dedupeHeaders` — throw `makeParseError("MULTI_TABLE_DETECTED", { reason, hint })` bij detectie
- [ ] `ParseErrorCode` uitbreiden: `"MULTI_TABLE_DETECTED"` met optionele payload `{ reason, hint }`
- [ ] `Upload.tsx` foutpaneel: "Multiple tables detected" + hint per reason + "Replace file" CTA; geen "Try anyway" — copy legt uit waarom ("Parsing silently continues with wrong data")
- [ ] Privacy-assert: detectie-output bevat geen cell-waarden, alleen structurele info (rij/kolom-indexen + reason code)
- [ ] Unit tests met fixtures: `horizontal-split.csv`, `vertical-stacked.csv`, `trailing-empty-cols.csv` (false positive guard), `single-table.csv`
- [ ] Privacy-test: `JSON.stringify(result)` bevat geen fixture cell-waarden
- [ ] Performance-test: <50ms op 10k-rij dataset (early-exit garandeert dit)
**Acceptance criteria**
- [ ] CSV met side-by-side tabellen → upload geblokkeerd, actionable hint zichtbaar
- [ ] XLSX-sheet met stacked tables → geblokkeerd
- [ ] Normale tabel met enkel trailing empty kolommen → geen false positive
- [ ] Detectie kost <50ms op 10k-rij dataset
- [ ] Foutbericht bevat geen ruwe data — alleen structurele beschrijving
- [ ] Network tab: geen POST request (client-side only)
---
 
 
 
**Prioriteit:** P0
**Einddatum:** 5 juni 2026
**Geschatte tijd:** 4u
**Hangt af van:** LOUPE-16, LOUPE-15
 
**Over project**
Server action die ChartSpec + aggregated PlotData + Receipt opslaat. **Privacy-kritisch:** asseert dat geen rauwe rijen in payload zitten voor het naar Supabase gaat.
 
**Actie-items**
- [x] `src/app/charts/actions.ts` — `saveChart` server action
- [x] Payload validatie via Zod (alleen aggregaten, geen array-of-rows)
- [x] Privacy-assert: scan PlotData op verdachte structuur, throw als detected
- [x] Update vs. insert logica op basis van `id`
- [x] revalidatePath('/dashboard') bij succes
**Acceptance criteria**
- [x] KM met 600 patiënten saved als <5kB JSON (alleen step-points)
- [x] Privacy-assert blokkeert mock-payload met `rows[]` veld
---
 
### LOUPE-18 · Dashboard listing + load
 
**Prioriteit:** P0
**Einddatum:** 6 juni 2026
**Geschatte tijd:** 5u
**Hangt af van:** LOUPE-17
 
**Over project**
`/dashboard` toont saved charts. Klik om te laden in `/export` voor verdere bewerking. Delete met bevestiging.
 
**Actie-items**
- [x] `/dashboard/page.tsx` — server component, fetch charts van user
- [x] Card per chart: thumbnail (mini-render), titel, datum, chart-type badge
- [x] Sort: laatst bewerkt eerst
- [x] Klik → laadt ChartSpec in app state, navigeert naar `/export?id=...`
- [x] Delete-action met confirmation modal
- [x] Empty state: friendly copy + CTA naar `/upload`
**Acceptance criteria**
- [x] Saved chart verschijnt onmiddelijk na save
- [x] Reload van `/export?id=...` toont identieke chart
- [x] Delete verwijdert direct uit Supabase + UI
---
 
### LOUPE-19 · SVG export
 
**Prioriteit:** P0
**Einddatum:** 7 juni 2026
**Geschatte tijd:** 2u
**Hangt af van:** LOUPE-11 (eerste werkende chart)
 
**Over project**
Inline alle styles in de SVG, sanitize, download als file. Filename = sanitized titel.
 
**Actie-items**
- [x] `src/lib/export/exportSvg.ts` — pakt SVG node, inlines computed styles
- [x] Strip data-react attributes
- [x] Filename helper: titel → `kebab-case-truncated-50.svg`
- [x] Download trigger via `URL.createObjectURL` + `<a download>`
**Acceptance criteria**
- [x] Geëxporteerde SVG opent in Illustrator + Inkscape met correcte fonts (mits geïnstalleerd)
- [x] Bestandsnaam veilig op alle OS (geen `/` of `:`)
---
 
### LOUPE-20 · PNG export via canvas
 
**Prioriteit:** P0
**Einddatum:** 8 juni 2026
**Geschatte tijd:** 4u
**Hangt af van:** LOUPE-19
 
**Over project**
SVG → canvas → PNG. DPI selector (300, 600). Belangrijk: fonts moeten ingebed zijn anders krijg je serif-fallbacks.
 
**Actie-items**
- [x] `exportPng.ts` — encodeert SVG als data URL, tekent op canvas, toBlob
- [x] DPI berekening: viewBox * (dpi/96)
- [x] Font embedding: serialize `@font-face` rules in SVG style tag
- [x] Test: 600dpi PNG op Source Serif tekst is scherp
- [x] Loading-state tijdens rasterisatie (kan 1-2s duren)
**Acceptance criteria**
- [x] 300dpi PNG van een KM chart heeft scherpe typografie
- [x] Bestandsgrootte op 300dpi onder 2MB voor standaard chart
---
 
### LOUPE-21 · Reproducibility receipt
 
**Prioriteit:** P0
**Einddatum:** 9 juni 2026
**Geschatte tijd:** 4u
**Hangt af van:** LOUPE-07, LOUPE-12
 
**Over project**
Compose receipt uit ChartSpec + AI-redenering + lokale berekeningen. Copy-to-clipboard voor supplementary materials. Dit is een onderscheidend feature voor je jury — bewijst dat je "reasoning, not magic" claim niet leeg is.
 
**Actie-items**
- [x] `src/lib/receipt/composeReceipt.ts` — neemt spec + reasoning + computations
- [x] Output formaat: leesbare plain text met sections (Intent, Recommendation, Alternatives considered, Computations performed, Configuration hash)
- [x] Configuration hash: SHA-256 over ChartSpec (deterministisch)
- [x] Copy-to-clipboard knop in `/export`
- [x] Download als `.txt`
**Acceptance criteria**
- [x] Receipt van een KM chart vermeldt: intent, dat KM gekozen werd boven box, dat censoring werd toegepast op N patiënten, hash voor reproducibility
- [x] Copy-to-clipboard werkt in Chrome + Firefox + Safari
---
 
# SPRINT 6 · 10 → 15 juni
## Polish + Documentatie + Demo-prep
 
---
 
### LOUPE-22 · Loading + error states audit
 
**Prioriteit:** P0
**Einddatum:** 11 juni 2026
**Geschatte tijd:** 4u
**Hangt af van:** alles ervoor
 
**Over project**
Walk door élke async actie en zorg voor expliciete loading + error UI. De jury merkt onmiddellijk wanneer iets "vastloopt" zonder feedback.
 
**Actie-items**
- [x] Audit-lijst van alle async-flows (parsing, AI-call, save, load, export, delete)
- [x] Per flow: loading indicator + error fallback met retry indien zinvol
- [x] Globale error boundary in app router
- [x] Friendly error-copy in design system voice (geen "An error occurred")
- [x] Toast-systeem voor non-blocking feedback (save success, etc.)
**Acceptance criteria**
- [x] Disable network → elke flow toont gracefull error
- [x] Geen white-screen crashes in 30 minuten use
---
 
### LOUPE-23 · Edge cases hardening
 
**Prioriteit:** P0
**Einddatum:** 12 juni 2026
**Geschatte tijd:** 4u
**Hangt af van:** LOUPE-22
 
**Over project**
Pre-jury bug bash. Test scenarios die je niet wil dat de jury ontdekt.
 
**Actie-items**
- [ ] CSV met missende headers
- [ ] CSV met mixed types in 1 kolom
- [ ] Volledig lege file
- [ ] XLSX met enkel lege sheets
- [ ] XLSX met 5+ sheets (selector overflow gedrag)
- [ ] Sheet-switch mid-flow (column mapping reset confirmation)
- [ ] AI-call timeout > 30s
- [ ] Manual picker → switch terug naar AI flow zonder mapping te verliezen
- [ ] User reset-password midden in een flow
- [ ] Browser back-button na save
- [ ] **Privacy-paranoid scan:** open Network tab tijdens flow, valideer dat alleen schema/intent uit de browser gaat — getest op alle 4 chart types
**Acceptance criteria**
- [ ] Network-tab audit: enkel `/api/ai/recommend` POSTs zien, met enkel kolomnamen + types in payload — nooit waarden
- [ ] Alle scenarios geven graceful UX
---
 
### LOUPE-24 · Technische documentatie
 
**Prioriteit:** P0
**Einddatum:** 14 juni 2026
**Geschatte tijd:** 9u (was 8u, +1u voor privacy boundary diagram)
**Hangt af van:** —
 
**Over project**
Dit is een grote taak — onderschat het niet. Een jury kijkt vaak eerst naar je documentatie voor je code. Privacy is je structurele product-positionering — dat moet technisch verifieerbaar zijn in de documentatie, niet alleen geclaimd.
 
**Actie-items**
- [ ] Architecture overview — diagram van dataflow client-side vs. server-side
- [ ] **Privacy boundary technisch geverifieerd:** dataflow-diagram (browser → server action → Vercel AI Gateway → Anthropic), per pijl de payload-inhoud + retentiebeleid van elk station
- [ ] **Eerlijke disclosure:** kolomnaam-PHI risico erkend, met PHI-warning (LOUPE-06) als mitigatie en V2 anonymize-toggle als toekomstige hardening
- [ ] AI integration: prompt-design, response schema, cost-bewaking, chart-whitelist
- [ ] Chart engine: ChartSpec → renderer → export
- [ ] Storage: schema, RLS, save format
- [ ] Deployment: Vercel + Supabase + AI Gateway env vars
- [ ] Known limitations (incl. small-n re-identification risk uit eerdere brief)
- [ ] V2 backlog: log-rank, Cox via Pyodide, embeddable HTML, ROC, Forest plot, Violin, anonymize-toggle
**Acceptance criteria**
- [ ] Een onbekende dev kan de code op basis van dit document terugbouwen tot architectuur-niveau
- [ ] Privacy-claim is technisch verifieerbaar uit het document
- [ ] Dataflow-diagram toont expliciet welke data welk station passeert
---
 
### LOUPE-25 · Productiedossier completion
 
**Prioriteit:** P0
**Einddatum:** 14 juni 2026
**Geschatte tijd:** 6.5u (was 6u, +0.5u voor decision log entries D3 + chart-pivot)
**Hangt af van:** —
 
**Over project**
Procesnarratief sinds research-fase. Decisions log. User research integratie. Wat ging niet en hoe je dat oploste.
 
**Actie-items**
- [ ] Tijdlijn van research-fase tot uitwerkingsfase
- [ ] Decision log: D3 vs Vega-Lite (publication-grade SVG was doorslaggevend), save-architectuur, scope-keuzes
- [ ] **Decision log entry — Chart-shortlist pivot (12 mei 2026):** ROC + Forest vervangen door Box + XY. Onderbouwing: ROC dekt vooral diagnostic-test studies (smaller niche dan ingeschat), Forest is meta-analysis-specifiek en stond al gemarkeerd als P1 cut-candidate. Box + XY dekken distributievergelijking en longitudinale trend / correlatie — door 3 van 4 respondenten genoemd als gat in huidige tooling.
- [ ] **Decision log entry — Manual chart picker (12 mei 2026):** introductie van LOUPE-04b als gevolg van docent-feedback. AI als assistent, niet als poortwachter — graceful fallback bij AI-failure.
- [ ] User research integratie: hoe je interviewinzichten product-beslissingen vormden
- [ ] Self-reflectie: wat ging niet, wat zou je opnieuw doen
- [ ] Jury-versie van design system snippets
**Acceptance criteria**
- [ ] Document leest als een proces, niet als een feature-list
- [ ] Drie expliciete momenten waar je van koers veranderde (chart-pivot, manual picker, en één derde — bv. forest cut of multi-sheet)
---
 
### LOUPE-26 · Demo script + rehearsal
 
**Prioriteit:** P0
**Einddatum:** 15 juni 2026
**Geschatte tijd:** 4u
**Hangt af van:** alles ervoor
 
**Over project**
Live demo op de jury-dagen. Een script + 2 rehearsals + backup plan voor wifi/AI-failure.
 
**Actie-items**
- [ ] Demo-flow: landing → upload demo-CSV → recommend → customize → export → save → dashboard
- [ ] Demo-CSV's prepared:
  - 1 voor KM (bv. 300 patiënten survival)
  - 1 voor BarError (group means)
  - 1 voor Box (biomarker per stage)
  - 1 voor XY (longitudinaal of correlatie)
  - 1 voor multi-sheet XLSX scenario
  - 1 backup
- [ ] Script met talking-points per scherm — wat je zegt + wat je toont
- [ ] Anticipated questions list: privacy boundary, AI keuze (waarom AI als optie + niet verplicht), scope (waarom 4 charts), chart-keuze (waarom Box i.p.v. Violin)
- [ ] Backup plan: lokale screencast als wifi/AI uitvalt
- [ ] Rehearsal 1: solo, getimed
- [ ] Rehearsal 2: voor iemand zonder context, om vragen te oogsten
**Acceptance criteria**
- [ ] Demo onder 8 minuten, alle features langs
- [ ] Backup screencast bestaat en werkt offline
- [ ] 5+ jury-questions beantwoord in voorbereiding
---
 
# Risico-analyse
 
## Wat ik ervan verwacht dat fout zal gaan
 
| Risico | Waarschijnlijkheid | Impact | Mitigatie |
|---|---|---|---|
| AI prompt vergt veel meer iteratie dan begroot | Hoog | LOUPE-06 loopt uit | Tijdsbox op 8u max, gebruik bestaande hardcoded copy als baseline |
| KM at-risk tabel is vervelender dan het lijkt | Middel | LOUPE-12 +3u | Ship eerst zonder at-risk tabel, voeg in sprint 4 toe |
| Schema delta op LOUPE-01 raakt meer call sites dan verwacht | Middel | LOUPE-01 +2u extra | Downstream cleanup als aparte commit; eerst schema clean, dan UI |
| D3 + React Compiler conflicten | Laag | LOUPE-10 +2u | Sprint 3 dag 1: simpele test-render. Bij issue: zet compiler uit voor chart-files |
| Box plot quartielberekening wijkt af van R conventie | Laag | LOUPE-13 +1u | Documenteer R `type=7` keuze in code, test tegen bekende fixture |
| XY regressie edge cases (n<3, perfect collinear) | Middel | LOUPE-14 +1u | Skip regressie met expliciete warning in receipt |
| Documentatie loopt uit | Hoog | Laatste week chaos | Schrijf 30 min/dag eraan vanaf sprint 3. Niet uitstellen. |
| AI budget overrun (>50 EUR) | Laag-middel | Persoonlijk | Cache + rate limit in LOUPE-09. Budget-alarm in AI Gateway |
| Last-minute bug ontdekt op jury-dag | Hoog | Reputatie | Local screencast als backup (LOUPE-26) |
| Privacy-claim faalt onder Network-tab scrutiny | Laag | Reputatie kritisch | LOUPE-23 paranoid scan + transparency preview (LOUPE-06) als bewijslaag |
 
## Wat snijden als je achterop loopt — beslisboom
 
1. **Eerst:** LOUPE-08 (override polish) — shell volstaat
2. **Daarna:** LOUPE-15 annotaties (P1-deel) — basis customization volstaat
3. **Daarna:** PHI-warning in LOUPE-06 (de regex-detectie) — transparency preview blijft, warning kan
4. **Daarna:** LOUPE-14 XY plot — val terug op 3 chart types (KM, BarError, Box). Verdedigbare scope A.
5. **Niet snijden:** documentatie, demo-prep, edge cases, privacy-validatie, manual picker
## Wat NOOIT snijden
 
- Privacy-validatie (LOUPE-23 deel) — dit is je product-positionering
- Transparency preview (LOUPE-06 deel) — bewijst privacy-claim verifieerbaar
- Manual chart picker (LOUPE-04b) — al geïmplementeerd, alleen content-update vereist
- Reproducibility receipt (LOUPE-21) — uniek differentiator vs. concurrentie
- Demo rehearsal (LOUPE-26) — de jury-dag is geen test-moment
---
 
# Notion-import tip
 
Dit document is structureel zo opgebouwd dat je het kan importeren als Notion-pagina via **Import → Markdown & CSV**. De headers worden automatisch toggle-blocks en checklists worden interactieve to-do's. Per ticket kan je de inhoud kopiëren in een Notion-projectkaart met velden:
 
- **Status:** start standaard op "Niet gestart"
- **Prioriteit:** P0 / P1 / P2 — kopieer uit ticket-header
- **Einddatum:** kopieer uit ticket-header
- **Over project:** kopieer paragraaf "Over project"
- **Actie-items:** kopieer checklist (Notion converteert automatisch naar to-do's)
Acceptance criteria horen onderaan de "Over project" sectie of in de comments.