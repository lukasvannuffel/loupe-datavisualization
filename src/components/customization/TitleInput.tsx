"use client";

import { deriveTitle } from "@/lib/chartSpec/labels/deriveTitle";
import { resolveChartLabels } from "@/lib/chartSpec/labels/resolveChartLabels";
import {
    updateCustomizationTitle,
    type SpecUpdater,
} from "@/lib/chartSpec/customizations/patchSpec";
import type { ChartSpec } from "@/lib/chartSpec/types";

type TitleInputProps = {
    readonly spec: ChartSpec;
    readonly onSpecChange: (updater: SpecUpdater) => void;
};

const derivedPlaceholder = (spec: ChartSpec): string => {
    const labels = resolveChartLabels(spec);
    if (spec.kind === "xy") {
        return deriveTitle({
            chartKind: "xy",
            mode: spec.mode,
            xLabel: labels.xLabel,
            yLabel: labels.yLabel,
        });
    }

    return deriveTitle({
        chartKind: spec.kind,
        xLabel: labels.xLabel,
        yLabel: labels.yLabel,
    });
};

export const TitleInput = ({ spec, onSpecChange }: TitleInputProps): JSX.Element => {
    const value = spec.customizations?.title ?? spec.title;
    const placeholder = derivedPlaceholder(spec);

    return (
        <label className="customization-field" htmlFor="customization-title">
            <span className="customization-field__label">Figure title</span>
            <input
                id="customization-title"
                type="text"
                className="customization-field__input"
                aria-label="Figure title"
                value={value}
                placeholder={placeholder}
                onChange={(event) => {
                    onSpecChange((prev) => updateCustomizationTitle(prev, event.target.value));
                }}
            />
        </label>
    );
};
