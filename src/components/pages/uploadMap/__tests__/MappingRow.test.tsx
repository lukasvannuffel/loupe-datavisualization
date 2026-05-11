// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

import type { ColumnInference } from "@/lib/parser/inference.types";

import { MappingRow } from "../MappingRow";

const col = (
    over: Partial<ColumnInference> & Pick<ColumnInference, "name" | "primaryType">,
): ColumnInference => ({
    confidence: 1,
    reasons: [],
    nullCount: 0,
    uniqueCount: 10,
    sampleValues: [],
    ...over,
});

const optionValues = (select: HTMLSelectElement): readonly string[] =>
    Array.from(select.options).map((o) => o.value);

describe("MappingRow", () => {
    it("renders column name, ex: samples, and a type badge", () => {
        render(
            <MappingRow
                column={col({
                    name: "age_at_baseline",
                    primaryType: "numeric",
                    sampleValues: ["64", "71", "58"],
                })}
                role="ignore"
                onChangeRole={vi.fn()}
            />,
        );
        expect(screen.getByText("age_at_baseline")).toBeTruthy();
        expect(screen.getByText("ex: 64, 71, 58")).toBeTruthy();
        expect(screen.getByText("numeric")).toBeTruthy();
    });

    it("numeric column offers time/outcome/predictor/x/y + ignore — not group/event/id", () => {
        render(
            <MappingRow
                column={col({ name: "n", primaryType: "numeric" })}
                role="ignore"
                onChangeRole={vi.fn()}
            />,
        );
        const select = screen.getByRole("combobox") as HTMLSelectElement;
        const values = optionValues(select);
        expect(values).toEqual(
            expect.arrayContaining(["ignore", "time", "outcome", "predictor", "x", "y"]),
        );
        expect(values).not.toContain("group");
        expect(values).not.toContain("event");
        expect(values).not.toContain("id");
    });

    it("categorical column offers group/predictor + ignore — not time/event/x/y", () => {
        render(
            <MappingRow
                column={col({ name: "c", primaryType: "categorical" })}
                role="ignore"
                onChangeRole={vi.fn()}
            />,
        );
        const values = optionValues(screen.getByRole("combobox") as HTMLSelectElement);
        expect(values).toContain("group");
        expect(values).toContain("predictor");
        expect(values).not.toContain("time");
        expect(values).not.toContain("event");
        expect(values).not.toContain("x");
        expect(values).not.toContain("y");
    });

    it("binary event-status column shows amber event tag and offers event role", () => {
        render(
            <MappingRow
                column={col({
                    name: "event_observed",
                    primaryType: "binary",
                    semanticTag: "event-status",
                })}
                role="event"
                onChangeRole={vi.fn()}
            />,
        );
        const tag = screen.getByText("event");
        expect(tag.className).toContain("type-badge--accent");
        const values = optionValues(screen.getByRole("combobox") as HTMLSelectElement);
        expect(values).toContain("event");
    });

    it("missing values render an amber missing: N chip", () => {
        render(
            <MappingRow
                column={col({ name: "age", primaryType: "numeric", nullCount: 12 })}
                role="ignore"
                onChangeRole={vi.fn()}
            />,
        );
        const chip = screen.getByText("missing: 12");
        expect(chip.className).toContain("is-warn");
    });
});
