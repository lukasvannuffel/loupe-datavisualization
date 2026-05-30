// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { ExportError, exportSvg } from "@/lib/export/exportSvg";
import { toSvgFilename } from "@/lib/export/filenameHelper";

const buildPlotContainer = (): { container: HTMLDivElement; serialized: () => string } => {
    let captured = "";

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:export");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const originalBlob = globalThis.Blob;
    vi.stubGlobal(
        "Blob",
        class MockBlob extends originalBlob {
            constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
                super(parts ?? [], options);
                captured = String(parts?.[0] ?? "");
            }
        },
    );

    const container = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    container.appendChild(svg);

    return {
        container,
        serialized: () => captured,
    };
};

describe("exportSvg", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("throws ExportError with reason NO_SVG when container has no plot SVG child", async () => {
        const container = document.createElement("div");

        await expect(exportSvg(container, "My Chart")).rejects.toMatchObject({
            reason: "NO_SVG",
        });
        await expect(exportSvg(container, "My Chart")).rejects.toBeInstanceOf(ExportError);
    });

    it("removes data-reactroot and data-react attributes from serialized output", async () => {
        const { container, serialized } = buildPlotContainer();
        const svg = container.querySelector("svg");

        svg?.setAttribute("data-reactroot", "");
        svg?.setAttribute("data-reactid", "1");

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("data-react-props", "x");
        svg?.appendChild(text);

        await exportSvg(container, "React strip");

        expect(serialized()).not.toMatch(/data-react/i);
    });

    it("inlines matching CSS rules onto elements", async () => {
        const { container, serialized } = buildPlotContainer();
        const svg = container.querySelector("svg");
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("class", "chart-label");
        svg?.appendChild(label);

        const style = document.createElement("style");
        style.textContent = ".chart-label { fill: red; }";
        document.head.appendChild(style);

        await exportSvg(container, "Styled chart");

        expect(serialized()).toMatch(/fill:\s*red/i);
        style.remove();
    });

    it("creates one object URL and sets the download filename from the title", async () => {
        const { container } = buildPlotContainer();
        const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL");
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click");
        const createElementSpy = vi.spyOn(document, "createElement");

        await exportSvg(container, "My Chart!");

        expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);

        const anchor = createElementSpy.mock.results.find(
            (result) => result.value instanceof HTMLAnchorElement,
        )?.value as HTMLAnchorElement | undefined;

        expect(anchor?.download).toBe(toSvgFilename("My Chart!"));
    });

    it("embeds fetched fonts as base64 data URLs", async () => {
        const { container, serialized } = buildPlotContainer();
        const bytes = new Uint8Array([0x77, 0x4f, 0x46, 0x32]);

        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(bytes, { status: 200, statusText: "OK" }),
        );

        await exportSvg(container, "Font chart", {
            fontUrl: "https://example.com/font.woff2",
            fontFamily: "Inter",
        });

        expect(serialized()).toContain("data:font/woff2;base64,");
        expect(serialized()).toContain("font-family:'Inter'");
    });

    it("warns and still exports when font fetch fails", async () => {
        const { container, serialized } = buildPlotContainer();
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL");

        vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

        await exportSvg(container, "Font fallback", {
            fontUrl: "https://example.com/font.woff2",
            fontFamily: "Inter",
        });

        expect(warnSpy).toHaveBeenCalledWith(
            "Loupe export: font fetch failed, exporting without embedded font",
        );
        expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
        expect(serialized()).not.toContain("data:font/woff2;base64,");
    });

    // MUTATION-VERIFY:
    //   In src/lib/export/exportSvg.ts, remove the data-react attribute strip loop
    //   inside stripReactArtifacts (keep the TreeWalker, delete the removeAttribute calls).
    //   Re-run "removes data-reactroot and data-react attributes from serialized output".
    //   Serialized output still contains data-reactroot -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.
});
