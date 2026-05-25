"use client";

import type { SpecUpdater } from "@/lib/chartSpec/customizations/patchSpec";
import type { ChartSpec } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

import { AxisLabelInput } from "./AxisLabelInput";
import { BarRail } from "./BarRail";
import { BoxRail } from "./BoxRail";
import { TitleInput } from "./TitleInput";
import { XYRail } from "./XYRail";

type CustomizationRailProps = {
    readonly spec: ChartSpec;
    readonly mapping: Mapping;
    readonly errorBandsAvailable?: boolean;
    readonly onSpecChange: (updater: SpecUpdater) => void;
};

export const CustomizationRail = ({
    spec,
    mapping,
    errorBandsAvailable = false,
    onSpecChange,
}: CustomizationRailProps): JSX.Element => (
    <aside aria-label="Customize chart" className="customization-rail">
        <section className="customization-rail__section">
            <h3 className="customization-rail__heading">Title and labels</h3>
            <TitleInput spec={spec} onSpecChange={onSpecChange} />
            <AxisLabelInput axis="x" mapping={mapping} spec={spec} onSpecChange={onSpecChange} />
            <AxisLabelInput axis="y" mapping={mapping} spec={spec} onSpecChange={onSpecChange} />
        </section>

        <section className="customization-rail__section">
            <h3 className="customization-rail__heading">Chart options</h3>
            {spec.kind === "barError" ? <BarRail spec={spec} onSpecChange={onSpecChange} /> : null}
            {spec.kind === "km" ? (
                <p className="customization-rail__empty muted">No options yet.</p>
            ) : null}
            {spec.kind === "box" ? <BoxRail spec={spec} onSpecChange={onSpecChange} /> : null}
            {spec.kind === "xy" ? (
                <XYRail
                    errorBandsAvailable={errorBandsAvailable}
                    spec={spec}
                    onSpecChange={onSpecChange}
                />
            ) : null}
        </section>
    </aside>
);
