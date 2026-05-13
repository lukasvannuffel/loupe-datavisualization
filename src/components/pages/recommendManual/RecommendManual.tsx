"use client";

/**
 * Manual chart picker. The user has already opted out of AI recommendation on
 * `/recommend/choose`; this view lets them pick one of the four V1 chart kinds
 * directly. No network calls — verifiable in the Network tab and by the
 * "privacy regression" test in this folder. The selection writes a fully-typed
 * default `ChartSpec` into app state and navigates to `/export`, matching the
 * AI flow's hand-off route.
 */

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { Eyebrow } from "@/components/primitives/Eyebrow";
import { useAppState } from "@/app/providers";
import { createDefaultChartSpec, type SpecKind } from "@/lib/chartSpec";
import { getCompatibility, type ChartCompatibility } from "@/lib/roles";

type ChartOption = {
    readonly kind: SpecKind;
    readonly title: string;
    readonly description: string;
    readonly example: string;
};

/**
 * V1 catalog. Copy matches the approved AI rationale tone used on `/recommend`
 * when a real `Receipt` is shown.
 */
const CHART_OPTIONS: readonly ChartOption[] = [
    {
        kind: "km",
        title: "Kaplan–Meier curve",
        description:
            "Time-to-event survival estimator that accounts for censored patients.",
        example: "Use for: comparing 5-year survival between treatment arms.",
    },
    {
        kind: "barError",
        title: "Bar chart with error bars",
        description:
            "Group means with uncertainty shown as SD, SEM, or 95% CI caps.",
        example: "Use for: comparing an outcome across a few named cohorts.",
    },
    {
        kind: "box",
        title: "Box plot",
        description:
            "Distributional comparison of a continuous variable across two or more groups.",
        example: "Use for: comparing biomarker concentrations across disease stages.",
    },
    {
        kind: "xy",
        title: "XY plot (line / scatter)",
        description:
            "Continuous trend over time or correlation between two continuous variables.",
        example:
            "Use for: tracking tumour diameter per visit, or testing baseline biomarker against response.",
    },
];

const formatMissing = (compat: ChartCompatibility): string => {
    if (compat.missingLabels.length === 0) {
        return "";
    }
    if (compat.missingLabels.length === 1) {
        return `Needs a ${compat.missingLabels[0]} column.`;
    }

    return `Needs columns mapped to ${compat.missingLabels.join(" and ")}.`;
};

const formatManualPickerMissing = (kind: SpecKind, compat: ChartCompatibility): string => {
    if (compat.missingRoles.length === 0) {
        return "";
    }

    if (kind === "box") {
        const missOutcome = compat.missingRoles.includes("outcome");
        const missGroup = compat.missingRoles.includes("group");

        if (missOutcome && missGroup) {
            return "Needs a numeric value column and a categorical group.";
        }

        if (missOutcome && !missGroup) {
            return "Needs a numeric value column.";
        }

        if (!missOutcome && missGroup) {
            return "Needs a categorical group column.";
        }
    }

    if (kind === "xy") {
        return "Needs numeric x and y columns.";
    }

    return formatMissing(compat);
};

export const RecommendManual = (): JSX.Element => {
    const router = useRouter();
    const {
        hydrated,
        mapping,
        selectionMode,
        setSelectionMode,
        setChartSlug,
        setChartSpec,
    } = useAppState();

    /**
     * Funnel guard: this page is only meaningful once the user has explicitly
     * picked manual mode. A direct deep-link sends them back to the chooser so
     * provenance is always recorded before the picker UI is shown.
     */
    useEffect(() => {
        if (!hydrated) {
            return;
        }
        if (selectionMode !== "manual") {
            router.replace("/recommend/choose");
        }
    }, [hydrated, selectionMode, router]);

    const compatibility = useMemo(() => getCompatibility(mapping), [mapping]);

    const onPick = (option: ChartOption): void => {
        if (!compatibility[option.kind].compatible) {
            return;
        }
        // Manual selection: ensure provenance is `manual` BEFORE writing the
        // spec — `setSelectionMode` clears stale chart data on an actual mode
        // change, so writing the spec afterwards prevents an order-of-operations
        // wipe. No AI request is made; the privacy regression test in this
        // folder asserts zero network calls.
        const spec = createDefaultChartSpec(option.kind);
        setSelectionMode("manual");
        setChartSpec(spec);
        setChartSlug(option.kind);
        router.push("/export");
    };

    const onSwitchToAi = (): void => {
        setSelectionMode("ai");
        router.push("/recommend");
    };

    return (
        <div className="manual-page page-enter">
            <div className="container container--narrow">
                <div className="manual-head">
                    <Eyebrow>Step 3 · Pick your chart</Eyebrow>
                    <h1 id="manual-heading" className="manual-title">
                        Which chart do you need?
                    </h1>
                    <p className="manual-sub muted">
                        Choose the chart that fits your finding. Cards marked as needing more
                        mapping aren't available yet — head back to the column-mapping step to
                        add the missing role, or switch to the AI recommendation.
                    </p>
                </div>

                <div
                    className="manual-grid"
                    role="list"
                    aria-labelledby="manual-heading"
                    data-testid="manual-grid"
                >
                    {CHART_OPTIONS.map((option) => {
                        const compat = compatibility[option.kind];
                        const disabledCopy = formatManualPickerMissing(option.kind, compat);
                        const isDisabled = !compat.compatible;

                        return (
                            <div key={option.kind} role="listitem">
                                <button
                                    type="button"
                                    className={
                                        "manual-card" + (isDisabled ? " manual-card--disabled" : "")
                                    }
                                    onClick={() => onPick(option)}
                                    disabled={isDisabled}
                                    aria-disabled={isDisabled}
                                    aria-describedby={
                                        isDisabled ? `manual-${option.kind}-missing` : undefined
                                    }
                                    data-testid={`manual-card-${option.kind}`}
                                >
                                    <span className="manual-card-eyebrow">
                                        {isDisabled ? "Unavailable" : "Available"}
                                    </span>
                                    <h2 className="manual-card-title">{option.title}</h2>
                                    <p className="manual-card-body">{option.description}</p>
                                    <p className="manual-card-example mono">{option.example}</p>
                                    {isDisabled && (
                                        <p
                                            id={`manual-${option.kind}-missing`}
                                            className="manual-card-missing"
                                            data-testid={`manual-missing-${option.kind}`}
                                        >
                                            {disabledCopy}
                                        </p>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="manual-footer">
                    <button
                        type="button"
                        className="btn btn--quiet btn--sm"
                        data-testid="switch-to-ai"
                        onClick={onSwitchToAi}
                    >
                        ← Use the AI recommendation instead
                    </button>
                </div>
            </div>
        </div>
    );
};
