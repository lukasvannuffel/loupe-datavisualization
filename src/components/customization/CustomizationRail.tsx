"use client";

import { useState } from "react";

import type { UserPalette } from "@/app/palettes/schemas";
import { storedPaletteId } from "@/components/charts/d3/palettes";
import { CustomSection } from "@/components/pages/CustomSection";
import {
    updateCustomizationPalette,
    type SpecUpdater,
} from "@/lib/chartSpec/customizations/patchSpec";
import type { ChartSpec } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

import { AxisLabelInput } from "./AxisLabelInput";
import { BarRail } from "./BarRail";
import { BoxRail } from "./BoxRail";
import { FrameRail } from "./FrameRail";
import { KmRail } from "./KmRail";
import { PaletteSelector } from "./PaletteSelector";
import { TitleInput } from "./TitleInput";
import { XYRail } from "./XYRail";

type CustomizationRailProps = {
    readonly spec: ChartSpec;
    readonly mapping: Mapping;
    readonly errorBandsAvailable?: boolean;
    readonly userPalettes?: readonly UserPalette[];
    readonly onSpecChange: (updater: SpecUpdater) => void;
};

export const CustomizationRail = ({
    spec,
    mapping,
    errorBandsAvailable = false,
    userPalettes = [],
    onSpecChange,
}: CustomizationRailProps): JSX.Element => {
    const [openSection, setOpenSection] = useState<string | null>("titles");

    return (
        <aside aria-label="Customize chart" className="customization-rail">
            <CustomSection
                id="titles"
                label="Title and labels"
                open={openSection}
                setOpen={setOpenSection}
            >
                <TitleInput spec={spec} onSpecChange={onSpecChange} />
                <AxisLabelInput axis="x" mapping={mapping} spec={spec} onSpecChange={onSpecChange} />
                <AxisLabelInput axis="y" mapping={mapping} spec={spec} onSpecChange={onSpecChange} />
            </CustomSection>

            <CustomSection
                id="colors"
                hint="Colorblind-safe options included"
                label="Colors"
                open={openSection}
                setOpen={setOpenSection}
            >
                <PaletteSelector
                    userPalettes={userPalettes}
                    value={storedPaletteId(spec)}
                    onChange={(next) => {
                        onSpecChange((prev) => updateCustomizationPalette(prev, next));
                    }}
                />
            </CustomSection>

            <CustomSection
                id="chart-options"
                label="Chart options"
                open={openSection}
                setOpen={setOpenSection}
            >
                <FrameRail spec={spec} onSpecChange={onSpecChange} />
                {spec.kind === "km" ? <KmRail spec={spec} onSpecChange={onSpecChange} /> : null}
                {spec.kind === "barError" ? <BarRail spec={spec} onSpecChange={onSpecChange} /> : null}
                {spec.kind === "box" ? <BoxRail spec={spec} onSpecChange={onSpecChange} /> : null}
                {spec.kind === "xy" ? (
                    <XYRail
                        errorBandsAvailable={errorBandsAvailable}
                        spec={spec}
                        onSpecChange={onSpecChange}
                    />
                ) : null}
            </CustomSection>
        </aside>
    );
};
