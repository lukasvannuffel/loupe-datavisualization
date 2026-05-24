// @vitest-environment happy-dom

import { render, screen, within } from "@testing-library/react";
import { scaleLinear } from "d3-scale";
import { describe, expect, it } from "vitest";

import { aggregateKaplanMeier } from "@/lib/chartSpec/aggregators/kaplanMeier";
import { nAtRiskAtTime } from "@/lib/chartSpec/aggregators/nAtRiskAtTime";
import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { axisTickCountForWidth } from "../applyAxes";
import { AtRiskTable } from "../atRiskTable";

const mapping: Mapping = { time: "time", event: "event", group: "arm" };

const syntheticRows = brandRows([
    { arm: "A", time: "5", event: "1" },
    { arm: "A", time: "8", event: "1" },
    { arm: "A", time: "10", event: "0" },
    { arm: "A", time: "12", event: "1" },
    { arm: "A", time: "15", event: "0" },
    { arm: "A", time: "18", event: "1" },
    { arm: "A", time: "20", event: "1" },
    { arm: "A", time: "22", event: "0" },
    { arm: "A", time: "25", event: "1" },
    { arm: "A", time: "30", event: "1" },
]);

describe("AtRiskTable", () => {
    it("renders a semantic table aligned to xScale ticks", () => {
        const data = aggregateKaplanMeier(syntheticRows, mapping);
        const innerWidth = 400;
        const tickCount = axisTickCountForWidth(innerWidth);
        const xScale = scaleLinear().domain([0, data.tMax]).range([0, innerWidth]);
        render(
            <AtRiskTable
                groups={data.groups}
                innerWidth={innerWidth}
                marginLeft={48}
                tickCount={tickCount}
                xScale={xScale}
            />,
        );

        expect(
            screen.getByRole("table", { name: "Number at risk per group over time" }),
        ).toBeTruthy();
        expect(xScale.ticks(tickCount)).toContain(10);
    });

    it("shows nAtRisk=8 for group A at t=10", () => {
        const group = aggregateKaplanMeier(syntheticRows, mapping).groups[0];
        expect(nAtRiskAtTime(group as NonNullable<typeof group>, 10)).toBe(8);

        const innerWidth = 400;
        const tickCount = axisTickCountForWidth(innerWidth);
        const xScale = scaleLinear().domain([0, 30]).range([0, innerWidth]);
        const { container } = render(
            <AtRiskTable
                groups={[group as NonNullable<typeof group>]}
                innerWidth={innerWidth}
                marginLeft={48}
                tickCount={tickCount}
                xScale={xScale}
            />,
        );

        expect(xScale.ticks(tickCount)).toContain(10);
        expect(within(container).getByTestId("at-risk-A-10").textContent).toBe("8");
    });
});
