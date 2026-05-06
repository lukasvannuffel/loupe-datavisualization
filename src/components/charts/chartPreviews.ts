import type { ComponentType } from "react";

import type { ChartSlug } from "@/lib/chartSpec/types";

import { Bar } from "./Bar";
import { BarHorizontal } from "./BarHorizontal";
import { BarWithError } from "./BarWithError";
import { BlandAltman } from "./BlandAltman";
import { BoxPlot } from "./BoxPlot";
import { Donut } from "./Donut";
import { DotPlot } from "./DotPlot";
import { Funnel } from "./Funnel";
import { ForestPlot } from "./ForestPlot";
import { GroupedBar } from "./GroupedBar";
import { Histogram } from "./Histogram";
import { KaplanMeier } from "./KaplanMeier";
import { Line } from "./Line";
import { Lollipop } from "./Lollipop";
import { PairedPlot } from "./PairedPlot";
import { Pie } from "./Pie";
import { PublicationKM } from "./PublicationKM";
import { ROC } from "./ROC";
import { Sankey } from "./Sankey";
import { Scatter } from "./Scatter";
import { SpaghettiPlot } from "./SpaghettiPlot";
import { StackedBar } from "./StackedBar";
import { StackedBar100 } from "./StackedBar100";
import { Sunburst } from "./Sunburst";
import { Violin } from "./Violin";
import { Volcano } from "./Volcano";
import type { ChartPreviewProps, PublicationChartProps } from "./types";

export type { ChartSlug };

export const CHART_PREVIEWS: Record<ChartSlug, ComponentType<ChartPreviewProps>> = {
    km: KaplanMeier,
    forest: ForestPlot,
    box: BoxPlot,
    roc: ROC,
    volcano: Volcano,
    bland: BlandAltman,
    violin: Violin,
    funnel: Funnel,
    spaghetti: SpaghettiPlot,
    barError: BarWithError as unknown as ComponentType<ChartPreviewProps>,
    dot: DotPlot as unknown as ComponentType<ChartPreviewProps>,
    groupedBar: GroupedBar as unknown as ComponentType<ChartPreviewProps>,
    bar: Bar,
    barHorizontal: BarHorizontal,
    stackedBar: StackedBar,
    stackedBar100: StackedBar100,
    line: Line,
    scatter: Scatter,
    histogram: Histogram,
    pie: Pie,
    donut: Donut,
    lollipop: Lollipop,
    pairedPlot: PairedPlot,
    sankey: Sankey,
    sunburst: Sunburst,
};

export const CHART_PUBLICATION: Partial<Record<ChartSlug, ComponentType<PublicationChartProps>>> = {
    km: PublicationKM,
    barError: BarWithError,
    dot: DotPlot,
    groupedBar: GroupedBar,
};

export const getPublicationChart = (slug: ChartSlug): ComponentType<PublicationChartProps> => {
    const publication = CHART_PUBLICATION[slug];
    if (publication) {
        return publication;
    }

    return CHART_PREVIEWS[slug] as unknown as ComponentType<PublicationChartProps>;
};
