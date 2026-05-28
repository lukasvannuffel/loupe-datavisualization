// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { generateThumbnail } from "@/lib/thumbnail/generateThumbnail";

class MockImage {
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;

    set src(_: string) {
        this.onload?.();
    }
}

describe("generateThumbnail", () => {
    const originalImage = globalThis.Image;
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:thumb");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
    const toDataUrlSpy = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL");

    afterEach(() => {
        globalThis.Image = originalImage;
        createObjectUrlSpy.mockClear();
        revokeObjectUrlSpy.mockClear();
        getContextSpy.mockReset();
        toDataUrlSpy.mockReset();
    });

    it("returns a generic icon data URL for scatter charts", async () => {
        const thumbnail = await generateThumbnail("xy", "xy", document.createElementNS("http://www.w3.org/2000/svg", "svg"));

        expect(thumbnail).toMatch(/^data:image\/svg\+xml;/);
        expect(thumbnail).not.toMatch(/^data:image\/png/);
    });

    it("returns a generic icon data URL for box charts", async () => {
        const thumbnail = await generateThumbnail("box", "box", document.createElementNS("http://www.w3.org/2000/svg", "svg"));

        expect(thumbnail).toMatch(/^data:image\/svg\+xml;/);
    });

    it("returns a PNG render for KM charts", async () => {
        globalThis.Image = MockImage as unknown as typeof Image;
        getContextSpy.mockReturnValue({
            fillRect: vi.fn(),
            drawImage: vi.fn(),
            fillStyle: "",
        } as unknown as CanvasRenderingContext2D);
        toDataUrlSpy.mockReturnValue("data:image/png;base64,km");

        const thumbnail = await generateThumbnail("km", "km", document.createElementNS("http://www.w3.org/2000/svg", "svg"));

        expect(thumbnail).toMatch(/^data:image\/png/);
    });

    it("returns a PNG render for xy longitudinal charts", async () => {
        globalThis.Image = MockImage as unknown as typeof Image;
        getContextSpy.mockReturnValue({
            fillRect: vi.fn(),
            drawImage: vi.fn(),
            fillStyle: "",
        } as unknown as CanvasRenderingContext2D);
        toDataUrlSpy.mockReturnValue("data:image/png;base64,longitudinal");

        const thumbnail = await generateThumbnail("xy", "longitudinal", document.createElementNS("http://www.w3.org/2000/svg", "svg"));

        expect(thumbnail).toMatch(/^data:image\/png/);
    });
});
