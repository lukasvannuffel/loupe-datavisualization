// @vitest-environment happy-dom

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InlineEditableText } from "../InlineEditableText";

const baseProps = {
    dataRole: "axis-label-x",
    foreignX: 10,
    foreignY: 10,
    height: 24,
    value: "Treatment group",
    width: 160,
    x: 90,
    y: 200,
    onChange: vi.fn(),
};

describe("InlineEditableText", () => {
    it("clicking display text opens an input; blur commits", () => {
        const onChange = vi.fn();
        const { container } = render(
            <svg xmlns="http://www.w3.org/2000/svg">
                <InlineEditableText {...baseProps} onChange={onChange} />
            </svg>,
        );

        const label = container.querySelector('[data-role="axis-label-x"]');
        expect(label).toBeTruthy();
        fireEvent.click(label!);

        const input = container.querySelector(".chart-inline-input") as HTMLInputElement;
        expect(input).toBeTruthy();

        fireEvent.change(input, { target: { value: "Arm A" } });
        fireEvent.blur(input);

        expect(onChange).toHaveBeenCalledWith("Arm A");
    });

    it("Escape during edit reverts to previous value", () => {
        const onChange = vi.fn();
        const { container } = render(
            <svg xmlns="http://www.w3.org/2000/svg">
                <InlineEditableText {...baseProps} onChange={onChange} />
            </svg>,
        );

        fireEvent.click(container.querySelector('[data-role="axis-label-x"]')!);

        const input = container.querySelector(".chart-inline-input") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "Temporary" } });
        fireEvent.keyDown(input, { key: "Escape" });

        expect(onChange).not.toHaveBeenCalled();
        expect(container.querySelector('[data-role="axis-label-x"]')?.textContent).toBe(
            "Treatment group",
        );
    });
});
