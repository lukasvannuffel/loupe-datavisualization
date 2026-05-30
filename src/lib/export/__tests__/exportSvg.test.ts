// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { ExportError, exportSvg } from "@/lib/export/exportSvg";
import { resetFontCacheForTests } from "@/lib/export/fontCache";
import { toSvgFilename } from "@/lib/export/filenameHelper";

const mockDomRect = (width: number, height: number): DOMRect =>
    ({
        width,
        height,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        toJSON: () => ({}),
    }) as DOMRect;

const buildPlotContainer = (options?: {
    readonly withAtRiskTable?: boolean;
    readonly rowHeaderLabel?: string;
    readonly rowHeaderColWidth?: number;
}): { container: HTMLDivElement; serialized: () => string; svg: SVGElement } => {
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
    svg.setAttribute("height", "240");
    svg.setAttribute("width", "500");
    svg.setAttribute("viewBox", "0 0 500 240");
    container.appendChild(svg);

    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue(mockDomRect(500, 240));

    if (options?.withAtRiskTable === true) {
        const wrap = document.createElement("div");
        wrap.className = "km-at-risk-wrap";
        const table = document.createElement("table");
        table.className = "km-at-risk-table mono";

        const caption = document.createElement("caption");
        caption.textContent = "AT RISK";
        table.appendChild(caption);

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        const cornerTh = document.createElement("th");
        const colWidth = options?.rowHeaderColWidth ?? 72;
        cornerTh.scope = "col";
        cornerTh.style.width = `${colWidth}px`;
        Object.defineProperty(cornerTh, "offsetWidth", {
            configurable: true,
            value: colWidth,
        });
        headerRow.appendChild(cornerTh);

        for (const time of ["0", "10"]) {
            const th = document.createElement("th");
            th.scope = "col";
            th.textContent = time;
            headerRow.appendChild(th);
        }

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        const row = document.createElement("tr");
        const rowHeader = document.createElement("th");
        rowHeader.scope = "row";
        rowHeader.textContent = options?.rowHeaderLabel ?? "Standard Therapy";
        row.appendChild(rowHeader);

        for (const value of ["50", "42"]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            cell.setAttribute("data-testid", `at-risk-Standard Therapy-${value}`);
            row.appendChild(cell);
        }

        tbody.appendChild(row);
        table.appendChild(tbody);
        table.style.marginLeft = "48px";
        vi.spyOn(window, "getComputedStyle").mockImplementation((el) => {
            const base = {
                fontFamily: "ui-monospace, monospace",
                getPropertyValue: (): string => "",
            } as unknown as CSSStyleDeclaration;

            if (el === table) {
                return { ...base, marginLeft: "48px" } as CSSStyleDeclaration;
            }

            return base;
        });
        wrap.appendChild(table);
        container.appendChild(wrap);
    }

    return {
        container,
        serialized: () => captured,
        svg,
    };
};

const setupExportMocks = (): { serialized: () => string } => {
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

    return { serialized: () => captured };
};

const buildChartSurfaceWithLabelOverlay = (): {
    container: HTMLDivElement;
    serialized: () => string;
} => {
    const { serialized } = setupExportMocks();

    const container = document.createElement("div");
    container.className = "chart-surface";

    const plotSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    plotSvg.setAttribute("height", "240");
    plotSvg.setAttribute("width", "500");
    plotSvg.setAttribute("viewBox", "0 0 500 240");
    container.appendChild(plotSvg);

    vi.spyOn(plotSvg, "getBoundingClientRect").mockReturnValue(mockDomRect(500, 240));

    const labelSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    labelSvg.setAttribute("class", "chart-labels-layer");

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("style", "fill: var(--ink)");
    text.textContent = "Title";
    group.appendChild(text);
    labelSvg.appendChild(group);

    const host = document.createElement("div");
    host.appendChild(labelSvg);
    container.appendChild(host);

    return { container, serialized };
};

const buildSiblingAtRiskDom = (): {
    surface: HTMLDivElement;
    serialized: () => string;
} => {
    const { serialized } = setupExportMocks();

    const outer = document.createElement("div");
    const chartWithLegend = document.createElement("div");
    chartWithLegend.className = "chart-with-legend";

    const surface = document.createElement("div");
    surface.className = "chart-surface";
    const plotSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    plotSvg.setAttribute("height", "240");
    plotSvg.setAttribute("width", "500");
    plotSvg.setAttribute("viewBox", "0 0 500 240");
    surface.appendChild(plotSvg);
    vi.spyOn(plotSvg, "getBoundingClientRect").mockReturnValue(mockDomRect(500, 240));

    chartWithLegend.appendChild(surface);
    outer.appendChild(chartWithLegend);

    const wrap = document.createElement("div");
    wrap.className = "km-at-risk-wrap";
    const table = document.createElement("table");
    table.className = "km-at-risk-table mono";

    const caption = document.createElement("caption");
    caption.textContent = "AT RISK";
    table.appendChild(caption);

    const tbody = document.createElement("tbody");
    const row = document.createElement("tr");
    const rowHeader = document.createElement("th");
    rowHeader.scope = "row";
    rowHeader.textContent = "Arm A";
    row.appendChild(rowHeader);
    const cell = document.createElement("td");
    cell.textContent = "12";
    row.appendChild(cell);
    tbody.appendChild(row);
    table.appendChild(tbody);
    table.style.marginLeft = "48px";
    wrap.appendChild(table);
    outer.appendChild(wrap);

    document.body.appendChild(outer);

    return { surface, serialized };
};

const mockPaletteComputedStyle = (): void => {
    vi.spyOn(window, "getComputedStyle").mockImplementation(
        () =>
            ({
                getPropertyValue: (prop: string): string => {
                    if (prop === "--palette-deuteranopia-0") {
                        return "#2563eb";
                    }

                    if (prop === "--palette-deuteranopia-1") {
                        return "#dc2626";
                    }

                    return "";
                },
                fontFamily: "ui-monospace, monospace",
            }) as CSSStyleDeclaration,
    );
};

const buildLegendListItem = (label: string, fill: string): HTMLLIElement => {
    const li = document.createElement("li");
    const glyphSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    glyphSvg.setAttribute("class", "chart-legend-glyph");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("fill", fill);
    rect.setAttribute("height", "8");
    rect.setAttribute("opacity", "0.85");
    rect.setAttribute("width", "10");
    glyphSvg.appendChild(rect);

    const labelSpan = document.createElement("span");
    labelSpan.textContent = label;
    li.appendChild(glyphSvg);
    li.appendChild(labelSpan);

    return li;
};

const buildChartSurfaceWithLegend = (options?: {
    readonly withAtRiskTable?: boolean;
}): { container: HTMLDivElement; serialized: () => string } => {
    const { serialized } = setupExportMocks();

    const chartWithLegend = document.createElement("div");
    chartWithLegend.className = "chart-with-legend";

    const surface = document.createElement("div");
    surface.className = "chart-surface";
    const plotSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    plotSvg.setAttribute("height", "240");
    plotSvg.setAttribute("width", "500");
    plotSvg.setAttribute("viewBox", "0 0 500 240");
    surface.appendChild(plotSvg);
    vi.spyOn(plotSvg, "getBoundingClientRect").mockReturnValue(mockDomRect(500, 240));

    chartWithLegend.appendChild(surface);

    const legend = document.createElement("ul");
    legend.setAttribute("aria-label", "Chart legend");
    legend.appendChild(buildLegendListItem("Label A", "var(--palette-deuteranopia-0)"));
    legend.appendChild(buildLegendListItem("Label B", "var(--palette-deuteranopia-1)"));
    chartWithLegend.appendChild(legend);

    const outer = document.createElement("div");
    outer.appendChild(chartWithLegend);

    if (options?.withAtRiskTable === true) {
        const wrap = document.createElement("div");
        wrap.className = "km-at-risk-wrap";
        const table = document.createElement("table");
        table.className = "km-at-risk-table mono";

        const tbody = document.createElement("tbody");
        const row = document.createElement("tr");
        const rowHeader = document.createElement("th");
        rowHeader.scope = "row";
        rowHeader.textContent = "Arm A";
        row.appendChild(rowHeader);
        const cell = document.createElement("td");
        cell.textContent = "12";
        row.appendChild(cell);
        tbody.appendChild(row);
        table.appendChild(tbody);
        table.style.marginLeft = "48px";
        wrap.appendChild(table);
        outer.appendChild(wrap);
    }

    document.body.appendChild(outer);

    return { container: surface, serialized };
};

describe("exportSvg", () => {
    afterEach(() => {
        resetFontCacheForTests();
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

    it("removes data-testid attributes from cloned SVG nodes", async () => {
        const { container, serialized } = buildPlotContainer();
        const svg = container.querySelector("svg");

        svg?.setAttribute("data-testid", "foo");

        await exportSvg(container, "Strip test ids");

        expect(serialized()).not.toMatch(/data-testid/i);
    });

    it("resolves var() presentation attributes using computed custom property values", async () => {
        const { container, serialized } = buildPlotContainer();
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("stroke", "var(--palette-deuteranopia-0)");
        container.querySelector("svg")?.appendChild(path);

        vi.spyOn(window, "getComputedStyle").mockImplementation(
            () =>
                ({
                    getPropertyValue: (prop: string): string => {
                        if (prop === "--palette-deuteranopia-0") {
                            return "#2563eb";
                        }

                        return "";
                    },
                }) as CSSStyleDeclaration,
        );

        await exportSvg(container, "Var stroke");

        expect(serialized()).toContain('stroke="#2563eb"');
        expect(serialized()).not.toMatch(/var\(--/);
    });

    it("resolves var() in nested descendants of label overlay", async () => {
        const { container, serialized } = buildChartSurfaceWithLabelOverlay();

        vi.spyOn(window, "getComputedStyle").mockImplementation(
            () =>
                ({
                    getPropertyValue: (prop: string): string => {
                        if (prop === "--ink" || prop === "fill") {
                            return "#0e0e0e";
                        }

                        return "";
                    },
                }) as CSSStyleDeclaration,
        );

        await exportSvg(container, "Label overlay");

        expect(serialized()).toMatch(/fill:\s*#0e0e0e/i);
        expect(serialized()).not.toMatch(/var\(--ink\)/);
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
            "Loupe export: font fetch failed for https://example.com/font.woff2",
        );
        expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
        expect(serialized()).not.toContain("data:font/woff2;base64,");
    });

    it("includes at-risk table text when a km-at-risk-wrap table is present", async () => {
        const { container, serialized } = buildPlotContainer({ withAtRiskTable: true });

        await exportSvg(container, "KM at risk");

        expect(serialized()).toContain("Standard");
        expect(serialized()).toContain("Therapy");
        expect(serialized()).toContain("50");
        expect(serialized()).not.toMatch(/data-testid/i);
    });

    it("wraps long at-risk row header into tspans within column width", async () => {
        const { container, serialized } = buildPlotContainer({
            withAtRiskTable: true,
            rowHeaderLabel: "Experimental Therapy",
            rowHeaderColWidth: 72,
        });

        await exportSvg(container, "KM wrapped header");

        const output = serialized();

        expect(output).toContain("<tspan");
        expect((output.match(/<tspan/g) ?? []).length).toBeGreaterThan(1);
        expect(output).not.toMatch(/<text[^>]*>Experimental Therapy<\/text>/);
        expect(output).toContain(">Experimental</tspan>");
        expect(output).toContain(">Therapy</tspan>");
        expect(output).not.toMatch(/<tspan[^>]*>Experiment<\/tspan>/);
        expect(output).not.toMatch(/<tspan[^>]*>al<\/tspan>/);
    });

    it("keeps value cells at fixed column boundary when label wraps", async () => {
        const marginLeft = 48;
        const rowHeaderColWidth = 72;
        const plotWidth = 500;
        const colWidth = (plotWidth - marginLeft - rowHeaderColWidth) / 2;
        const expectedValueX = marginLeft + rowHeaderColWidth + colWidth / 2;

        const { container, serialized } = buildPlotContainer({
            withAtRiskTable: true,
            rowHeaderLabel: "Experimental Therapy",
            rowHeaderColWidth: 72,
        });

        await exportSvg(container, "KM fixed boundary");

        const valueMatch = serialized().match(/<text[^>]*>50<\/text>/);
        const xMatch = valueMatch?.[0]?.match(/\sx="([^"]+)"/);

        expect(xMatch).toBeDefined();
        expect(Number(xMatch?.[1])).toBeCloseTo(expectedValueX, 5);
    });

    it("expands export height for multi-line at-risk rows", async () => {
        const shortLabel = buildPlotContainer({
            withAtRiskTable: true,
            rowHeaderLabel: "Arm A",
            rowHeaderColWidth: 72,
        });
        await exportSvg(shortLabel.container, "Short label");
        const shortHeight = Number(
            shortLabel.serialized().match(/<svg[^>]*\sheight="(\d+)"/)?.[1],
        );

        const longLabel = buildPlotContainer({
            withAtRiskTable: true,
            rowHeaderLabel: "Experimental Therapy",
            rowHeaderColWidth: 72,
        });
        await exportSvg(longLabel.container, "Long label");
        const longHeight = Number(
            longLabel.serialized().match(/<svg[^>]*\sheight="(\d+)"/)?.[1],
        );

        expect(longHeight).toBeGreaterThan(shortHeight);
    });

    it("falls back to default column width when thead offsetWidth is 0", async () => {
        const marginLeft = 48;
        const rowHeaderColWidth = 72;
        const plotWidth = 500;
        const colWidth = (plotWidth - marginLeft - rowHeaderColWidth) / 2;
        const expectedValueX = marginLeft + rowHeaderColWidth + colWidth / 2;

        const { container, serialized } = buildPlotContainer({
            withAtRiskTable: true,
            rowHeaderLabel: "Experimental Therapy",
            rowHeaderColWidth: 0,
        });

        const cornerTh = container.querySelector("thead th:first-child");

        if (cornerTh instanceof HTMLElement) {
            Object.defineProperty(cornerTh, "offsetWidth", {
                configurable: true,
                value: 0,
            });
            cornerTh.style.width = "";
        }

        await expect(exportSvg(container, "KM fallback col width")).resolves.toBeUndefined();

        expect(serialized()).toContain("<tspan");

        const valueMatch = serialized().match(/<text[^>]*>50<\/text>/);
        const xMatch = valueMatch?.[0]?.match(/\sx="([^"]+)"/);

        expect(xMatch).toBeDefined();
        expect(Number(xMatch?.[1])).toBeCloseTo(expectedValueX, 5);
    });

    // MUTATION-VERIFY:
    //   In src/lib/export/svgTableHelpers.ts wrapTextToLines, return [text.trim()] unconditionally.
    //   Re-run "wraps long at-risk row header into tspans within column width".
    //   Output lacks <tspan> for long label -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    it("increases SVG height when an at-risk table is present", async () => {
        const withoutTable = buildPlotContainer();
        await exportSvg(withoutTable.container, "No table");
        const heightWithout = withoutTable.serialized().match(/<svg[^>]*\sheight="(\d+)"/)?.[1];

        const withTable = buildPlotContainer({ withAtRiskTable: true });
        await exportSvg(withTable.container, "With table");
        const heightWith = withTable.serialized().match(/<svg[^>]*\sheight="(\d+)"/)?.[1];

        expect(Number(heightWith)).toBeGreaterThan(Number(heightWithout));
    });

    it("expands SVG height enough to fit at-risk table rows without clipping", async () => {
        const { container, serialized } = buildPlotContainer({ withAtRiskTable: true });

        await exportSvg(container, "KM fit");

        const plotHeight = 240;
        const minContentHeight = 43 + 18 + 11;
        const rootHeight = Number(serialized().match(/<svg[^>]*\sheight="(\d+)"/)?.[1]);

        expect(rootHeight).toBeGreaterThanOrEqual(plotHeight + minContentHeight);
    });

    it("expands viewBox height when viewBox is comma-separated", async () => {
        const { container, serialized } = buildPlotContainer({ withAtRiskTable: true });
        const svg = container.querySelector("svg");

        svg?.setAttribute("viewBox", "0,0,500,240");

        await exportSvg(container, "Comma viewBox");

        const viewBox = serialized().match(/viewBox="([^"]+)"/)?.[1];

        expect(viewBox).toBeDefined();
        expect(viewBox).toMatch(/^0 0 500 \d+$/);
        expect(Number(viewBox?.split(/\s+/)[3])).toBeGreaterThan(240);
    });

    it("finds at-risk table when it is a sibling of .chart-with-legend, not inside the container", async () => {
        const { surface, serialized } = buildSiblingAtRiskDom();

        try {
            await exportSvg(surface, "Sibling table");

            expect(serialized()).toContain("AT RISK");
            expect(serialized()).toContain("Arm A");
        } finally {
            surface.parentElement?.parentElement?.remove();
        }
    });

    it("renders legend items as SVG rect + text pairs", async () => {
        const { container, serialized } = buildChartSurfaceWithLegend();
        mockPaletteComputedStyle();

        try {
            await exportSvg(container, "Legend export");

            expect(serialized()).toContain("Label A");
            expect(serialized()).toContain("Label B");
            expect(serialized()).toContain('fill="#2563eb"');
            expect(serialized()).not.toMatch(/var\(--palette/);
        } finally {
            container.parentElement?.parentElement?.remove();
        }
    });

    it("renders legend for XY/KM chart type with path-based glyph marker", async () => {
        const { serialized } = setupExportMocks();

        const chartWithLegend = document.createElement("div");
        chartWithLegend.className = "chart-with-legend";

        const surface = document.createElement("div");
        surface.className = "chart-surface";
        const plotSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        plotSvg.setAttribute("height", "240");
        plotSvg.setAttribute("width", "500");
        plotSvg.setAttribute("viewBox", "0 0 500 240");
        surface.appendChild(plotSvg);
        vi.spyOn(plotSvg, "getBoundingClientRect").mockReturnValue(mockDomRect(500, 240));

        const legend = document.createElement("ul");
        legend.setAttribute("aria-label", "Chart legend");
        const li = document.createElement("li");
        const glyphSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        glyphSvg.setAttribute("class", "chart-legend-glyph");
        glyphSvg.setAttribute("data-role", "legend-glyph-marker");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M 0,-4 A 4,4 0 1,1 0,4");
        path.setAttribute("fill", "var(--palette-deuteranopia-0)");
        path.setAttribute("transform", "translate(6,6)");
        glyphSvg.appendChild(path);

        const labelSpan = document.createElement("span");
        labelSpan.textContent = "Yes";
        li.appendChild(glyphSvg);
        li.appendChild(labelSpan);
        legend.appendChild(li);

        chartWithLegend.appendChild(surface);
        chartWithLegend.appendChild(legend);
        document.body.appendChild(chartWithLegend);

        mockPaletteComputedStyle();

        try {
            await exportSvg(surface, "Path glyph legend");

            expect(serialized()).toContain("Yes");
            expect(serialized()).toContain('fill="#2563eb"');
            expect(serialized()).not.toMatch(/d="M 0,-4/);
            expect(serialized()).not.toMatch(/var\(--palette/);
        } finally {
            chartWithLegend.remove();
        }
    });

    it("renders legend for KM line glyph with stroke-only source element", async () => {
        const { serialized } = setupExportMocks();

        const chartWithLegend = document.createElement("div");
        chartWithLegend.className = "chart-with-legend";

        const surface = document.createElement("div");
        surface.className = "chart-surface";
        const plotSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        plotSvg.setAttribute("height", "240");
        plotSvg.setAttribute("width", "500");
        plotSvg.setAttribute("viewBox", "0 0 500 240");
        surface.appendChild(plotSvg);
        vi.spyOn(plotSvg, "getBoundingClientRect").mockReturnValue(mockDomRect(500, 240));

        const legend = document.createElement("ul");
        legend.setAttribute("aria-label", "Chart legend");
        const li = document.createElement("li");
        const glyphSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        glyphSvg.setAttribute("class", "chart-legend-glyph");
        glyphSvg.setAttribute("data-role", "legend-glyph-line");
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("stroke", "var(--palette-deuteranopia-0)");
        line.setAttribute("stroke-width", "1.5");
        line.setAttribute("x1", "1");
        line.setAttribute("x2", "11");
        line.setAttribute("y1", "6");
        line.setAttribute("y2", "6");
        glyphSvg.appendChild(line);

        const labelSpan = document.createElement("span");
        labelSpan.textContent = "Standard Therapy";
        li.appendChild(glyphSvg);
        li.appendChild(labelSpan);
        legend.appendChild(li);

        chartWithLegend.appendChild(surface);
        chartWithLegend.appendChild(legend);
        document.body.appendChild(chartWithLegend);

        mockPaletteComputedStyle();

        try {
            await exportSvg(surface, "KM line legend");

            expect(serialized()).toContain("Standard Therapy");
            expect(serialized()).toContain('fill="#2563eb"');
            expect(serialized()).not.toMatch(/stroke="var\(--palette/);
        } finally {
            chartWithLegend.remove();
        }
    });

    it("legend is placed below at-risk table when both are present", async () => {
        const atRiskOnly = buildPlotContainer({ withAtRiskTable: true });
        mockPaletteComputedStyle();
        await exportSvg(atRiskOnly.container, "At risk only");
        const heightAtRiskOnly = Number(
            atRiskOnly.serialized().match(/<svg[^>]*\sheight="(\d+)"/)?.[1],
        );

        const { container, serialized } = buildChartSurfaceWithLegend({ withAtRiskTable: true });
        mockPaletteComputedStyle();

        try {
            await exportSvg(container, "Legend and at risk");

            const heightWithBoth = Number(
                serialized().match(/<svg[^>]*\sheight="(\d+)"/)?.[1],
            );

            expect(heightWithBoth).toBeGreaterThan(heightAtRiskOnly);
            expect(serialized()).toContain("Label A");
            expect(serialized()).toContain("Arm A");
            expect(serialized()).toContain("chart-legend-export");
        } finally {
            container.parentElement?.parentElement?.remove();
        }
    });

    it("returns null and export completes when no legend element found", async () => {
        const baseline = buildPlotContainer();
        await exportSvg(baseline.container, "No legend baseline");
        const baselineHeight = Number(
            baseline.serialized().match(/<svg[^>]*\sheight="(\d+)"/)?.[1],
        );

        const { container, serialized } = buildPlotContainer();
        await exportSvg(container, "No legend");

        const heightWithoutLegend = Number(
            serialized().match(/<svg[^>]*\sheight="(\d+)"/)?.[1],
        );

        expect(heightWithoutLegend).toBe(baselineHeight);
        expect(serialized()).not.toContain("chart-legend-export");
    });

    // MUTATION-VERIFY:
    //   In src/lib/export/svgTableHelpers.ts legendToSvg, remove ?? glyphSvg.querySelector('[stroke]')
    //   fallback from glyphChild lookup.
    //   Re-run "renders legend for KM line glyph with stroke-only source element".
    //   Line glyph skipped; output lacks "Standard Therapy" -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    // MUTATION-VERIFY:
    //   In src/lib/export/svgTableHelpers.ts legendToSvg, change querySelector('[fill]')
    //   back to querySelector('rect').
    //   Re-run "renders legend for XY/KM chart type with path-based glyph marker".
    //   Path glyph skipped; output lacks "Yes" and fill="#2563eb" -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    // MUTATION-VERIFY:
    //   In src/lib/export/svgTableHelpers.ts resolvePresentationColor, return raw attribute
    //   without calling getComputedStyle (keep var() in output).
    //   Re-run "renders legend items as SVG rect + text pairs".
    //   Serialized output still contains var(--palette-deuteranopia-0) -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    // MUTATION-VERIFY:
    //   In src/lib/export/exportSvg.ts mergeLabelLayer, replace walkLiveAndClone with
    //   direct-children resolveVarAttrs/inlineStyles loop only.
    //   Re-run "resolves var() in nested descendants of label overlay".
    //   Nested text keeps fill="var(--ink)" -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    // MUTATION-VERIFY:
    //   In src/lib/export/exportSvg.ts, change measureAtRiskExportHeight to return
    //   bodyRowCount * AT_RISK_ROW_HEIGHT + AT_RISK_HEADER_TOP_Y instead of lastRowY + fontSize.
    //   Re-run "expands SVG height enough to fit at-risk table rows without clipping".
    //   root height 290 < required 312 -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    // MUTATION-VERIFY:
    //   In src/lib/export/exportSvg.ts, after cloneNode(true), insertBefore a decoy <path stroke="var(--...)">
    //   on the clone only (not on live). Re-run "resolves var() presentation attributes...".
    //   Parallel walkers desync; live path keeps var() in output -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    // MUTATION-VERIFY:
    //   In src/lib/export/exportSvg.ts, remove resolveVarAttrs(liveNode, cloneNode) inside walkLiveAndClone.
    //   Re-run "resolves var() presentation attributes using computed custom property values".
    //   Serialized output still contains var(--palette-deuteranopia-0) -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    // MUTATION-VERIFY:
    //   In src/lib/export/exportSvg.ts, comment out appendAtRiskTable(container, svgEl, clone) in exportSvg.
    //   Re-run "includes at-risk table text when a km-at-risk-wrap table is present".
    //   Serialized output no longer contains "Standard Therapy" -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.

    // MUTATION-VERIFY:
    //   In src/lib/export/exportSvg.ts, remove the data-* attribute strip loop inside stripDataAttributes.
    //   Re-run "removes data-reactroot and data-react attributes from serialized output".
    //   Serialized output still contains data-reactroot -> test RED.
    //   Verified manually: 2026-05-30. REVERTED.
});
