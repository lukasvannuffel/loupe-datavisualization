"use client";

import { patchSpecKind, type SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import type { BoxSpec } from "@/lib/chartSpec/types";

type BoxRailProps = {
    readonly spec: BoxSpec;
    readonly onSpecChange: (updater: SpecUpdater) => void;
};

type BoxToggleKey = "showOutliers" | "notched" | "showMeanMarker";

const TOGGLES: ReadonlyArray<{ readonly key: BoxToggleKey; readonly label: string }> = [
    { key: "showOutliers", label: "Show outliers" },
    { key: "notched", label: "Show notch (95% CI of median)" },
    { key: "showMeanMarker", label: "Show mean marker" },
];

export const BoxRail = ({ spec, onSpecChange }: BoxRailProps): JSX.Element => (
    <div className="customization-toggles">
        {TOGGLES.map((toggle) => (
            <label key={toggle.key} className="customization-toggle">
                <input
                    type="checkbox"
                    checked={spec[toggle.key]}
                    onChange={(event) => {
                        const checked = event.target.checked;
                        onSpecChange((prev) => {
                            if (prev.kind !== "box") {
                                return prev;
                            }

                            return patchSpecKind(prev, { [toggle.key]: checked });
                        });
                    }}
                />
                <span>{toggle.label}</span>
            </label>
        ))}
    </div>
);
