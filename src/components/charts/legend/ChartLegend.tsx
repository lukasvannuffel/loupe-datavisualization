"use client";

import { DASH_BY_INDEX } from "@/components/charts/d3/lineStyles";
import { MARKER_BY_INDEX } from "@/components/charts/d3/markerShapes";
import { colorByIndex } from "@/components/charts/d3/palettes";
import type { UserPalette } from "@/app/palettes/schemas";
import type { PaletteId } from "@/lib/chartSpec/types";

import styles from "./chartLegend.module.css";
import { BarLegendGlyph } from "./glyphs/BarLegendGlyph";
import { BoxLegendGlyph } from "./glyphs/BoxLegendGlyph";
import { LineLegendGlyph } from "./glyphs/LineLegendGlyph";
import { MarkerLegendGlyph } from "./glyphs/MarkerLegendGlyph";

export type ChartLegendKind = "bar" | "km" | "box" | "xy";

type LegendGroup = {
    readonly label: string;
};

type ChartLegendProps = {
    readonly chartKind: ChartLegendKind;
    readonly mode?: "line" | "scatter" | "both";
    readonly groups: ReadonlyArray<LegendGroup>;
    readonly palette: PaletteId | undefined;
    readonly userPalettes?: readonly UserPalette[];
};

type LegendGlyphProps = {
    readonly chartKind: ChartLegendKind;
    readonly mode?: "line" | "scatter" | "both";
    readonly index: 0 | 1 | 2 | 3;
    readonly palette: PaletteId | undefined;
    readonly groupCount: number;
    readonly userPalettes?: readonly UserPalette[];
};

const LegendGlyph = ({
    chartKind,
    mode,
    index,
    palette,
    groupCount,
    userPalettes,
}: LegendGlyphProps): JSX.Element => {
    const color = colorByIndex(palette, index, groupCount, userPalettes);
    const dash = DASH_BY_INDEX[index] ?? "";
    const shapePath = MARKER_BY_INDEX[index] ?? MARKER_BY_INDEX[0];
    const useEditorialFill = palette === undefined || palette === "editorial";

    switch (chartKind) {
        case "bar":
            return <BarLegendGlyph color={color} />;
        case "km":
            return <LineLegendGlyph color={color} dash={dash} />;
        case "box":
            return <BoxLegendGlyph color={color} useEditorialFill={useEditorialFill} />;
        case "xy": {
            if (mode === "scatter") {
                return <MarkerLegendGlyph color={color} shapePath={shapePath} />;
            }

            if (mode === "line") {
                return <LineLegendGlyph color={color} dash={dash} />;
            }

            return (
                <LineLegendGlyph
                    color={color}
                    dash={dash}
                    shapePath={shapePath}
                    withMarker
                />
            );
        }
    }
};

export const ChartLegend = ({
    chartKind,
    mode,
    groups,
    palette,
    userPalettes = [],
}: ChartLegendProps): JSX.Element | null => {
    if (groups.length < 2) {
        return null;
    }

    const groupCount = groups.length;

    return (
        <ul aria-label="Chart legend" className={styles.legend} role="list">
            {groups.map((group, index) => {
                const styleIndex = Math.min(index, 3) as 0 | 1 | 2 | 3;

                return (
                    <li key={group.label} className={styles.item}>
                        <LegendGlyph
                            chartKind={chartKind}
                            groupCount={groupCount}
                            index={styleIndex}
                            mode={mode}
                            palette={palette}
                            userPalettes={userPalettes}
                        />
                        <span className={styles.label}>{group.label}</span>
                    </li>
                );
            })}
        </ul>
    );
};
