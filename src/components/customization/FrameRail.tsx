"use client";

import {
    STROKE_WEIGHT_MAX,
    STROKE_WEIGHT_MIN,
    STROKE_WEIGHT_STEP,
} from "@/lib/chartSpec/constants";
import { patchBaseSpec, type SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import type { ChartSpec } from "@/lib/chartSpec/types";

type FrameRailProps = {
    readonly spec: ChartSpec;
    readonly onSpecChange: (updater: SpecUpdater) => void;
};

export const FrameRail = ({ spec, onSpecChange }: FrameRailProps): JSX.Element => (
    <div className="customization-frame">
        <label className="customization-toggle">
            <input
                type="checkbox"
                checked={spec.showGrid}
                onChange={(event) => {
                    const checked = event.target.checked;
                    onSpecChange((prev) => patchBaseSpec(prev, { showGrid: checked }));
                }}
            />
            <span>Show gridlines</span>
        </label>
        <div className="customization-slider">
            <label className="customization-slider__label" htmlFor="stroke-weight">
                Stroke weight {spec.strokeWeight.toFixed(1)}px
            </label>
            <input
                id="stroke-weight"
                type="range"
                min={STROKE_WEIGHT_MIN}
                max={STROKE_WEIGHT_MAX}
                step={STROKE_WEIGHT_STEP}
                value={spec.strokeWeight}
                onChange={(event) => {
                    const strokeWeight = Number.parseFloat(event.target.value);
                    onSpecChange((prev) => patchBaseSpec(prev, { strokeWeight }));
                }}
            />
        </div>
    </div>
);
