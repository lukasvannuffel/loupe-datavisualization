// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IntentBox } from "../IntentBox";

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("IntentBox placeholder rotator", () => {
    it("schedules an interval while intent is empty", () => {
        const spy = vi.spyOn(globalThis, "setInterval");
        render(<IntentBox intent="" onChange={() => {}} />);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does NOT schedule an interval when intent has content", () => {
        const spy = vi.spyOn(globalThis, "setInterval");
        render(<IntentBox intent="Compare arms" onChange={() => {}} />);
        expect(spy).not.toHaveBeenCalled();
    });
});
