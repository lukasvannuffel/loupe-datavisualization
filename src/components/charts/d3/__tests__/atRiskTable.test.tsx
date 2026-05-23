// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { scaleLinear } from "d3-scale";
import { describe, expect, it } from "vitest";

import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";

import { aggregateKaplanMeier } from "@/lib/chartSpec/aggregators/kaplanMeier";

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
    it("shows nAtRisk=8 for group A at t=10 on the synthetic fixture", () => {
        const data = aggregateKaplanMeier(syntheticRows, mapping);
        const xScale = scaleLinear().domain([0, data.tMax]).range([0, 400]);
        render(
            <AtRiskTable
                groups={data.groups}
                innerWidth={400}
                marginLeft={48}
                tMax={data.tMax}
                xScale={xScale}
            />,
        );

        const tick10 = data.groups[0]?.atRiskTicks.find((entry) => entry.t === 10);
        expect(tick10?.nAtRisk).toBe(8);

        const cell = screen.getByTestId("at-risk-A-10");
        expect(cell.textContent).toBe("8");
    });
});
