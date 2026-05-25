"use client";

import { patchSpecKind, type SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import type { BarErrorSpec } from "@/lib/chartSpec/types";

type BarRailProps = {
    readonly spec: BarErrorSpec;
    readonly onSpecChange: (updater: SpecUpdater) => void;
};

const OPTIONS = [
    { value: "sd" as const, label: "SD" },
    { value: "sem" as const, label: "SEM" },
    { value: "ci95" as const, label: "95% CI" },
];

export const BarRail = ({ spec, onSpecChange }: BarRailProps): JSX.Element => (
    <fieldset className="customization-options" aria-label="Error bar type">
        <legend className="customization-options__legend mono">Error bars</legend>
        <div className="customization-options__row">
            {OPTIONS.map((opt) => (
                <label
                    key={opt.value}
                    className={
                        "customization-radio " + (spec.errorBarType === opt.value ? "is-active" : "")
                    }
                >
                    <input
                        type="radio"
                        name="error-bar-type"
                        value={opt.value}
                        checked={spec.errorBarType === opt.value}
                        onChange={() => {
                            onSpecChange((prev) => {
                                if (prev.kind !== "barError") {
                                    return prev;
                                }

                                return patchSpecKind(prev, { errorBarType: opt.value });
                            });
                        }}
                    />
                    <span>{opt.label}</span>
                </label>
            ))}
        </div>
    </fieldset>
);
