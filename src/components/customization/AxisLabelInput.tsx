"use client";

import { buildCustomizations } from "@/lib/chartSpec/labels/buildCustomizations";
import { updateAxisLabel, type SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import type { ChartSpec } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

type AxisLabelInputProps = {
    readonly axis: "x" | "y";
    readonly spec: ChartSpec;
    readonly mapping: Mapping;
    readonly onSpecChange: (updater: SpecUpdater) => void;
};

const axisLabel = (spec: ChartSpec, axis: "x" | "y"): string => {
    if (axis === "x") {
        return spec.customizations?.axes?.x?.label ?? spec.xLabel ?? "";
    }

    return spec.customizations?.axes?.y?.label ?? spec.yLabel ?? "";
};

export const AxisLabelInput = ({
    axis,
    spec,
    mapping,
    onSpecChange,
}: AxisLabelInputProps): JSX.Element => {
    const derived = buildCustomizations(spec, mapping);
    const placeholder =
        axis === "x"
            ? (derived.axes?.x?.label ?? "")
            : (derived.axes?.y?.label ?? "");
    const title = axis === "x" ? "X-axis label" : "Y-axis label";

    const fieldId = `customization-axis-${axis}`;

    return (
        <label className="customization-field" htmlFor={fieldId}>
            <span className="customization-field__label">{title}</span>
            <input
                id={fieldId}
                type="text"
                className="customization-field__input"
                aria-label={title}
                value={axisLabel(spec, axis)}
                placeholder={placeholder}
                onChange={(event) => {
                    onSpecChange((prev) => updateAxisLabel(prev, axis, event.target.value));
                }}
            />
        </label>
    );
};
