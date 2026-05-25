import type { Mapping } from "@/lib/roles/types";

import type { ChartSpec, Customizations } from "../types";
import { deriveLabel } from "./deriveLabel";
import { deriveTitle } from "./deriveTitle";

const KM_Y_LABEL = "Survival probability";

const defaultColumn = (kind: ChartSpec["kind"], role: "x" | "y"): string => {
    switch (kind) {
        case "km":
            return role === "x" ? "time" : KM_Y_LABEL;
        case "barError":
        case "box":
            return role === "x" ? "group" : "outcome";
        case "xy":
            return role === "x" ? "x" : "y";
    }
};

const columnForAxis = (kind: ChartSpec["kind"], mapping: Mapping, role: "x" | "y"): string => {
    switch (kind) {
        case "km":
            return role === "x" ? (mapping.time ?? defaultColumn(kind, "x")) : KM_Y_LABEL;
        case "barError":
        case "box":
            return role === "x"
                ? (mapping.group ?? defaultColumn(kind, "x"))
                : (mapping.outcome ?? defaultColumn(kind, "y"));
        case "xy":
            return role === "x"
                ? (mapping.x ?? defaultColumn(kind, "x"))
                : (mapping.y ?? defaultColumn(kind, "y"));
    }
};

/** Build always-populated customizations from mapping + chart kind (LOUPE-15a). */
export const buildCustomizations = (spec: ChartSpec, mapping: Mapping = {}): Customizations => {
    const xColumn = columnForAxis(spec.kind, mapping, "x");
    const yColumn = columnForAxis(spec.kind, mapping, "y");
    const xLabel = deriveLabel(xColumn);
    const yLabel = spec.kind === "km" ? KM_Y_LABEL : deriveLabel(yColumn);
    const title = deriveTitle({
        chartKind: spec.kind,
        mode: spec.kind === "xy" ? spec.mode : undefined,
        xLabel,
        yLabel,
    });

    return {
        title,
        axes: {
            x: { label: xLabel },
            y: { label: yLabel },
        },
    };
};

/** Attach derived customizations and sync legacy `title` / axis label fields. */
export const attachCustomizations = (spec: ChartSpec, mapping: Mapping = {}): ChartSpec => {
    const derived = buildCustomizations(spec, mapping);
    const customizations: Customizations = {
        ...derived,
        ...spec.customizations,
        axes: {
            ...derived.axes,
            ...spec.customizations?.axes,
        },
    };

    return {
        ...spec,
        title: customizations.title ?? spec.title,
        xLabel: customizations.axes?.x?.label,
        yLabel: customizations.axes?.y?.label,
        customizations,
    };
};
