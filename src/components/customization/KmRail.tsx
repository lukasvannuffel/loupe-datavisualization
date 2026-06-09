"use client";

import { patchSpecKind, type SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import type { KMSpec } from "@/lib/chartSpec/types";

type KmRailProps = {
    readonly spec: KMSpec;
    readonly onSpecChange: (updater: SpecUpdater) => void;
};

export const KmRail = ({ spec, onSpecChange }: KmRailProps): JSX.Element => (
    <label className="customization-toggle">
        <input
            type="checkbox"
            checked={spec.showStats}
            onChange={(event) => {
                const checked = event.target.checked;
                onSpecChange((prev) => {
                    if (prev.kind !== "km") {
                        return prev;
                    }

                    return patchSpecKind(prev, { showStats: checked });
                });
            }}
        />
        <span>Show HR &amp; log-rank annotation</span>
    </label>
);
