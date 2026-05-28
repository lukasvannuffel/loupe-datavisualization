// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ViewOnlyNotice } from "@/components/pages/ViewOnlyNotice";

describe("ViewOnlyNotice", () => {
    it("renders snapshot privacy guidance and upload CTA", () => {
        render(<ViewOnlyNotice chartName="Saved scatter" thumbnail="data:image/svg+xml;utf8,test" />);

        expect(screen.getByText(/saved as a snapshot to protect patient data/i)).not.toBeNull();
        expect(screen.getByRole("link", { name: /re-upload source data/i }).getAttribute("href")).toBe("/upload");
    });
});
