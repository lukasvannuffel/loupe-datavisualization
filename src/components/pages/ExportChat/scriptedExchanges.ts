import type { ScriptedCategory, ScriptedExchange } from "./types";

const FALLBACK: ScriptedExchange = {
    id: "fallback",
    category: "fallback",
    match: [],
    userEcho: "",
    response:
        "I can't change that yet in this prototype. For palette, legend text, and axis labels, the customize rail on the right handles those directly. I do know how to: add annotations, re-fit the model, explain choices, and apply journal presets.",
};

export const SCRIPTED_EXCHANGES: readonly ScriptedExchange[] = [
    {
        id: "preset-nejm",
        category: "preset",
        match: [/nejm/i, /publication[- ]ready/i, /journal preset/i],
        userEcho: "Make this NEJM publication-ready.",
        response:
            "Switched to a print-safe monochrome palette, enabled the dashed second curve for redundant encoding, hid the gridlines, and slimmed the stroke to 1.2px. NEJM tends to prefer this look for survival figures.",
        patch: {
            paletteId: "mono",
            dashB: true,
            showGrid: false,
            strokeWeight: 1.2,
            eyebrow: "Figure 1",
        },
        receiptEntry: "Preset applied: NEJM publication-ready",
    },
    {
        id: "refit-rmst",
        category: "refit",
        match: [/non[- ]?proportional/i, /rmst/i, /re[- ]?fit/i, /proportional hazards/i],
        userEcho: "Re-fit assuming non-proportional hazards.",
        response:
            "Schoenfeld residuals show the proportional hazards assumption breaks after month 18. I switched the methods note to a restricted mean survival time (RMST) framing and hid the hazard-ratio annotation since it no longer applies.",
        patch: {
            caption:
                "Estimates by Kaplan–Meier method. Group comparison by restricted mean survival time (RMST) at 36 months. Hazard ratio omitted: PH assumption rejected (Schoenfeld test, p<0.05).",
            showStats: false,
        },
        receiptEntry: "Re-fit with RMST; PH assumption dropped",
    },
    {
        id: "explain-km-vs-cox",
        category: "explain",
        match: [/why.*kaplan/i, /why.*km/i, /why not cox/i, /why this chart/i],
        userEcho: "Why Kaplan–Meier and not a Cox curve?",
        response:
            "Your finding is descriptive — survival probability over time, by arm. Kaplan–Meier shows the empirical survival function directly, which is what reviewers expect for a primary endpoint. A Cox curve would show adjusted hazards, which is a modeling choice that belongs in a sensitivity analysis, not the primary figure.",
    },
    {
        id: "annotation-median",
        category: "annotation",
        match: [/marker/i, /median follow[- ]up/i, /annotat/i, /vertical line/i],
        userEcho: "Add a vertical marker at the median follow-up.",
        response:
            "Noted — the median follow-up sits at 24 months. In this prototype I record the annotation in the receipt; the rendered marker ships in the next iteration.",
        receiptEntry: "Annotation requested: median follow-up marker @ 24 months",
    },
    {
        id: "rail-palette",
        category: "rail",
        match: [/palette/i, /color[s]?/i, /wong/i, /okabe/i, /ibm design/i, /tol/i],
        userEcho: "Change the palette.",
        response: "Palette choices live in the customize rail so the receipt records the exact swatches.",
        railHint: {
            section: "colors",
            copy: "Open Colors in the customize rail",
        },
    },
    {
        id: "rail-legend",
        category: "rail",
        match: [/legend/i, /arm a/i, /arm b/i, /treatment a/i, /treatment b/i],
        userEcho: "Edit the legend.",
        response: "Legend text is a direct edit — the rail keeps it deterministic.",
        railHint: {
            section: "legend",
            copy: "Open Legend & overlays in the customize rail",
        },
    },
    {
        id: "rail-axes",
        category: "rail",
        match: [/axis/i, /axes/i, /x[- ]label/i, /y[- ]label/i, /grid/i],
        userEcho: "Edit the axes.",
        response: "Axis labels and gridlines are typographic decisions — the rail handles them.",
        railHint: {
            section: "axes",
            copy: "Open Axes in the customize rail",
        },
    },
    {
        id: "annotation-suggest-caption",
        category: "annotation",
        match: [/suggest.*caption/i, /caption.*for.*me/i, /draft.*caption/i],
        userEcho: "Suggest a caption for this figure.",
        response:
            "Drafted a caption that names the method, the comparison, and the headline test result. Edit it inline or in the rail; the receipt records the suggestion source.",
        patch: {
            caption:
                "Five-year overall survival was higher in arm A than arm B (HR 0.74; 95% CI 0.61–0.89; log-rank p < 0.001). 218 of 610 patients were censored before 60 months.",
        },
        receiptEntry: "Caption suggested by Loupe; user-edited",
    },
    {
        id: "annotation-figure-number",
        category: "annotation",
        match: [/figure number/i, /figure 3/i, /figure 2/i, /^fig \d/i, /number this figure/i],
        userEcho: "Set this as Figure 3.",
        response: "Updated the figure number to 3 — the eyebrow and the caption prefix both follow it.",
        patch: {
            figureNumber: "3",
            eyebrow: "Figure 3",
        },
        receiptEntry: "Figure number set to 3",
    },
    {
        id: "rail-annotations",
        category: "rail",
        match: [/significance bracket/i, /p[- ]value label/i, /add bracket/i, /annotation panel/i],
        userEcho: "Add a significance bracket between groups.",
        response:
            "Brackets and p-value labels live in the annotations panel — the rail keeps positions deterministic so the SVG export matches.",
        railHint: {
            section: "annotations",
            copy: "Open Annotations in the customize rail",
        },
    },
    {
        id: "rail-error-bars",
        category: "rail",
        match: [/error bar/i, /sd vs sem/i, /standard error/i, /\bci\b/i, /confidence interval/i],
        userEcho: "Switch the error bars to SEM.",
        response: "The error-bar type is an editorial choice — pick SD, SEM, or 95% CI in the rail.",
        railHint: {
            section: "errorBars",
            copy: "Open Error bars in the customize rail",
        },
    },
];

const CATEGORY_TO_EXCHANGE: Record<Exclude<ScriptedCategory, "fallback">, string> = {
    preset: "preset-nejm",
    refit: "refit-rmst",
    explain: "explain-km-vs-cox",
    annotation: "annotation-median",
    rail: "rail-palette",
};

export const SUGGESTION_CHIPS: readonly ScriptedExchange[] = [
    SCRIPTED_EXCHANGES.find((e) => e.id === CATEGORY_TO_EXCHANGE.preset)!,
    SCRIPTED_EXCHANGES.find((e) => e.id === CATEGORY_TO_EXCHANGE.refit)!,
    SCRIPTED_EXCHANGES.find((e) => e.id === CATEGORY_TO_EXCHANGE.explain)!,
    SCRIPTED_EXCHANGES.find((e) => e.id === CATEGORY_TO_EXCHANGE.annotation)!,
];

export const findExchange = (input: string): ScriptedExchange => {
    const trimmed = input.trim();

    if (trimmed.length === 0) {
        return FALLBACK;
    }

    for (const exchange of SCRIPTED_EXCHANGES) {
        for (const pattern of exchange.match) {
            if (typeof pattern === "string") {
                if (trimmed.toLowerCase().includes(pattern.toLowerCase())) {
                    return exchange;
                }
            } else if (pattern.test(trimmed)) {
                return exchange;
            }
        }
    }

    return FALLBACK;
};
