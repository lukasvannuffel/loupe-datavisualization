// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exportSvgString } from "@/lib/export/exportSvg";
import { exportPng } from "@/lib/export/exportPng";
import { fetchFontAsBase64 } from "@/lib/export/fontCache";

vi.mock("@/lib/export/exportSvg", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/export/exportSvg")>();

    return {
        ...actual,
        exportSvgString: vi.fn(),
    };
});

vi.mock("@/lib/export/fontCache", () => ({
    fetchFontAsBase64: vi.fn(),
}));

const SVG_XML =
    '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 658 240" width="658" height="240"></svg>';

const mockFontEntry = {
    base64: "QUJD",
    family: "Inter",
    style: "normal",
    weight: "400",
};

type PngMockOptions = {
    readonly imageOnError?: boolean;
};

const setupPngMocks = (
    options?: PngMockOptions,
): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    drawImage: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    downloadName: () => string;
    svgBlobPayload: () => string;
    revokeSpy: ReturnType<typeof vi.spyOn>;
} => {
    let capturedSvg = "";
    let download = "";
    let objectUrlCounter = 0;
    const fillRect = vi.fn();
    const drawImage = vi.fn();
    const scale = vi.fn();
    const ctx = {
        scale,
        fillStyle: "",
        fillRect,
        drawImage,
    } as unknown as CanvasRenderingContext2D;
    const canvas = document.createElement("canvas");

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        if (tag === "canvas") {
            return canvas;
        }

        if (tag === "a") {
            const anchor = document.createElementNS(
                "http://www.w3.org/1999/xhtml",
                "a",
            ) as HTMLAnchorElement;
            Object.defineProperty(anchor, "download", {
                set(value: string) {
                    download = value;
                },
                get() {
                    return download;
                },
            });
            anchor.click = vi.fn();
            return anchor;
        }

        return document.createElementNS("http://www.w3.org/1999/xhtml", tag);
    });

    canvas.getContext = vi.fn().mockReturnValue(ctx);
    canvas.toBlob = vi.fn((callback: BlobCallback) => {
        callback(new Blob(["png"], { type: "image/png" }));
    });

    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
        objectUrlCounter += 1;

        if (blob instanceof Blob && blob.type === "image/svg+xml") {
            return "blob:svg-url";
        }

        return "blob:png-url";
    });

    const originalBlob = globalThis.Blob;
    vi.stubGlobal(
        "Blob",
        class MockBlob extends originalBlob {
            constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
                super(parts ?? [], options);

                if (options?.type === "image/svg+xml") {
                    capturedSvg = String(parts?.[0] ?? "");
                }
            }
        },
    );

    class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = "";

        constructor() {
            queueMicrotask(() => {
                if (options?.imageOnError === true) {
                    this.onerror?.();
                    return;
                }

                this.onload?.();
            });
        }
    }

    vi.stubGlobal("Image", MockImage);

    return {
        canvas,
        ctx,
        drawImage,
        fillRect,
        downloadName: () => download,
        svgBlobPayload: () => capturedSvg,
        revokeSpy,
    };
};

describe("exportPng", () => {
    const container = document.createElement("div");

    beforeEach(() => {
        vi.mocked(exportSvgString).mockResolvedValue(SVG_XML);
        vi.mocked(fetchFontAsBase64).mockResolvedValue(mockFontEntry);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("scales canvas dimensions correctly for 300 dpi", async () => {
        const { canvas } = setupPngMocks();

        await exportPng(container, "KM chart", { dpi: 300 });

        expect(canvas.width).toBe(Math.round(658 * (300 / 96)));
        expect(canvas.height).toBe(Math.round(240 * (300 / 96)));
    });

    // MUTATION-VERIFY:
    //   In src/lib/export/exportPng.ts exportPng, change `options.dpi / 96` to `options.dpi / 72`.
    //   Re-run "scales canvas dimensions correctly for 300 dpi".
    //   canvas.width/height no longer match 300/96 scale -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    it("scales canvas dimensions correctly for 600 dpi", async () => {
        const { canvas } = setupPngMocks();

        await exportPng(container, "KM chart", { dpi: 600 });

        expect(canvas.width).toBe(Math.round(658 * (600 / 96)));
        expect(canvas.height).toBe(Math.round(240 * (600 / 96)));
    });

    it("canvas has white background before chart is drawn", async () => {
        const { ctx, drawImage, fillRect } = setupPngMocks();

        await exportPng(container, "KM chart", { dpi: 300 });

        expect(ctx.fillStyle).toBe("#ffffff");
        expect(fillRect).toHaveBeenCalledWith(0, 0, 658, 240);
        expect(fillRect.mock.invocationCallOrder[0]).toBeLessThan(
            drawImage.mock.invocationCallOrder[0]!,
        );
    });

    // MUTATION-VERIFY:
    //   In src/lib/export/exportPng.ts exportPng, move fillRect after drawImage.
    //   Re-run "canvas has white background before chart is drawn".
    //   fillRect call order no longer precedes drawImage -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    it("injects @font-face block into SVG string before rasterization", async () => {
        const { svgBlobPayload } = setupPngMocks();

        await exportPng(container, "KM chart", { dpi: 300 });

        expect(svgBlobPayload()).toContain("@font-face");
        expect(svgBlobPayload()).toContain("data:font/woff2");
    });

    it("inserts font styles inside svg root, not between xml declaration and svg", async () => {
        const { svgBlobPayload } = setupPngMocks();

        await exportPng(container, "KM chart", { dpi: 300 });

        const payload = svgBlobPayload();

        expect(payload).toContain("@font-face");
        expect(payload).toMatch(/\?>\s*<svg/);
        expect(payload).not.toMatch(/\?><style>/);
        expect(payload).toMatch(/<svg\b[^>]*><style>@font-face/);
    });

    // MUTATION-VERIFY:
    //   In src/lib/export/exportPng.ts injectFontFaces, restore fallback to xml.indexOf(">").
    //   Re-run "inserts font styles inside svg root, not between xml declaration and svg".
    //   Payload matches /?><style>/ -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    it("proceeds with export and sets fontWarning when font fetch fails", async () => {
        const { downloadName } = setupPngMocks();
        const dispatchSpy = vi.spyOn(document, "dispatchEvent");
        vi.mocked(fetchFontAsBase64).mockResolvedValue(null);

        await expect(exportPng(container, "KM chart", { dpi: 300 })).resolves.toBeUndefined();

        expect(downloadName()).toMatch(/\.png$/);
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "loupe:font-warning" }));
    });

    it("revokes SVG object URL when Image fires onerror", async () => {
        const { revokeSpy } = setupPngMocks({ imageOnError: true });

        await expect(exportPng(container, "KM chart", { dpi: 300 })).rejects.toMatchObject({
            reason: "SERIALIZE_FAILED",
        });

        expect(revokeSpy).toHaveBeenCalledWith("blob:svg-url");
    });

    // MUTATION-VERIFY:
    //   In src/lib/export/exportPng.ts exportPng, remove URL.revokeObjectURL from finally.
    //   Re-run "revokes SVG object URL when Image fires onerror".
    //   revokeSpy not called with blob:svg-url -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    it("toBlob null produces ExportError", async () => {
        const { canvas } = setupPngMocks();
        canvas.toBlob = vi.fn((callback: BlobCallback) => {
            callback(null);
        });

        await expect(exportPng(container, "KM chart", { dpi: 300 })).rejects.toMatchObject({
            reason: "SERIALIZE_FAILED",
        });
    });

    it("PNG filename replaces .svg extension with .png", async () => {
        const { downloadName } = setupPngMocks();

        await exportPng(container, "Kaplan Meier Survival", { dpi: 300 });

        expect(downloadName()).toBe("kaplan-meier-survival.png");
        expect(downloadName()).not.toContain(".svg");
    });
});
