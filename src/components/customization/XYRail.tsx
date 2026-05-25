"use client";

import { patchSpecKind, type SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import type { XYSpec } from "@/lib/chartSpec/types";

type XYRailProps = {
    readonly spec: XYSpec;
    readonly errorBandsAvailable: boolean;
    readonly onSpecChange: (updater: SpecUpdater) => void;
};

const MODES = [
    { value: "line" as const, label: "Line" },
    { value: "scatter" as const, label: "Scatter" },
    { value: "both" as const, label: "Both" },
];

export const XYRail = ({ spec, errorBandsAvailable, onSpecChange }: XYRailProps): JSX.Element => (
    <div className="customization-xy">
        <fieldset className="customization-options" aria-label="XY display mode">
            <legend className="customization-options__legend mono">Mode</legend>
            <div className="customization-options__row">
                {MODES.map((mode) => (
                    <label
                        key={mode.value}
                        className={
                            "customization-radio " + (spec.mode === mode.value ? "is-active" : "")
                        }
                    >
                        <input
                            type="radio"
                            name="xy-mode"
                            value={mode.value}
                            checked={spec.mode === mode.value}
                            onChange={() => {
                                onSpecChange((prev) => {
                                    if (prev.kind !== "xy") {
                                        return prev;
                                    }

                                    return patchSpecKind(prev, { mode: mode.value });
                                });
                            }}
                        />
                        <span>{mode.label}</span>
                    </label>
                ))}
            </div>
        </fieldset>

        <label className="customization-toggle">
            <input
                type="checkbox"
                checked={spec.showRegression}
                disabled={spec.mode === "line"}
                onChange={(event) => {
                    onSpecChange((prev) => {
                        if (prev.kind !== "xy") {
                            return prev;
                        }

                        return patchSpecKind(prev, { showRegression: event.target.checked });
                    });
                }}
            />
            <span>Show regression line</span>
        </label>

        <label className="customization-toggle">
            <input
                type="checkbox"
                checked={spec.showErrorBands}
                disabled={spec.mode === "scatter" || !errorBandsAvailable}
                onChange={(event) => {
                    onSpecChange((prev) => {
                        if (prev.kind !== "xy") {
                            return prev;
                        }

                        return patchSpecKind(prev, { showErrorBands: event.target.checked });
                    });
                }}
            />
            <span>Show error bands (SEM)</span>
        </label>
    </div>
);
