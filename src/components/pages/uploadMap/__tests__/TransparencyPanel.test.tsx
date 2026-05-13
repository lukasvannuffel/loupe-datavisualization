// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { RecommendPayload } from "@/lib/ai/recommendChart.types";

import { TransparencyPanel } from "../TransparencyPanel";

describe("TransparencyPanel", () => {
    it("renders summary, JSON payload, and privacy note", () => {
        const payload: RecommendPayload = {
            columns: [
                {
                    name: "age",
                    nullCount: 0,
                    primaryType: "numeric",
                    uniqueCount: 5,
                },
            ],
            intent: "Compare groups",
            mapping: { group: "arm" },
        };

        const { container } = render(<TransparencyPanel payload={payload} />);

        expect(screen.getByText(/What gets sent · click to view/)).not.toBeNull();
        expect(container.querySelector("code")?.textContent).toBe(JSON.stringify(payload, null, 2));
        expect(
            screen.getByText(/No values or rows leave your browser/i),
        ).not.toBeNull();
    });
});
