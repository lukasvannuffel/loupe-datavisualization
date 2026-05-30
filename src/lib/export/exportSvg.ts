import { toSvgFilename } from "./filenameHelper";

export class ExportError extends Error {
    constructor(
        public readonly reason: "NO_SVG" | "SERIALIZE_FAILED",
        msg: string,
    ) {
        super(msg);
        this.name = "ExportError";
    }
}

export interface ExportOptions {
    readonly fontUrl?: string;
    readonly fontFamily?: string;
}

export const CHART_EXPORT_FONT = {
    url: "https://fonts.gstatic.com/s/sourceserif4/v13/10Uf7uJ_341V8Wp32H1kYgVvL1_z.woff2",
    family: "Source Serif 4",
} as const;

const ALLOWED_PROPS = new Set([
    "color",
    "dominant-baseline",
    "fill",
    "font-family",
    "font-size",
    "font-weight",
    "opacity",
    "stroke",
    "stroke-width",
    "text-anchor",
    "transform",
]);

const PRESENTATION_ATTRS = [
    "fill",
    "stroke",
    "color",
    "stop-color",
    "flood-color",
    "lighting-color",
] as const;

const SVG_NS = "http://www.w3.org/2000/svg";
const AT_RISK_FILL = "#0e0e0e";
const AT_RISK_ROW_HEIGHT = 18;
// Must match km-at-risk-table thead th:first-child width in atRiskTable.tsx.
// If that component's header width changes, update this value to match.
const AT_RISK_ROW_HEADER_WIDTH = 72;
const AT_RISK_HEADER_TOP_Y = 32;
const AT_RISK_FONT_SIZE = 11;
const VAR_NAME_PATTERN = /^var\(\s*(--[^,)]+)/;

const measureAtRiskExportHeight = (bodyRowCount: number, fontSize: number): number => {
    const headerY = AT_RISK_HEADER_TOP_Y + fontSize;

    if (bodyRowCount === 0) {
        return headerY + fontSize;
    }

    const lastRowY = headerY + AT_RISK_ROW_HEIGHT + (bodyRowCount - 1) * AT_RISK_ROW_HEIGHT;

    return lastRowY + fontSize;
};

const isElement = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;

const isStyledElement = (node: Element): node is HTMLElement | SVGElement =>
    node instanceof HTMLElement || node instanceof SVGElement;

const extractVarName = (value: string): string | null => {
    const match = value.trim().match(VAR_NAME_PATTERN);

    return match?.[1] ?? null;
};

const getPlotSvg = (container: HTMLElement): SVGElement => {
    const directSvgs = [...container.children].filter(
        (child): child is SVGElement => child instanceof SVGElement,
    );

    if (directSvgs.length !== 1) {
        throw new ExportError("NO_SVG", "Chart container must contain exactly one plot SVG.");
    }

    return directSvgs[0]!;
};

const findAtRiskTable = (container: HTMLElement): HTMLTableElement | null => {
    const local = container.querySelector("table.km-at-risk-table");

    if (local instanceof HTMLTableElement) {
        return local;
    }

    const chartRoot = container.closest(".chart-with-legend")?.parentElement;
    const external = chartRoot?.querySelector("table.km-at-risk-table");

    return external instanceof HTMLTableElement ? external : null;
};

const fetchFontAsBase64 = async (url: string): Promise<string | null> => {
    try {
        const res = await fetch(url);

        if (!res.ok) {
            console.warn("Loupe export: font fetch failed, exporting without embedded font");
            return null;
        }

        const bytes = new Uint8Array(await res.arrayBuffer());
        let binary = "";

        for (let i = 0; i < bytes.length; i += 1) {
            binary += String.fromCharCode(bytes[i]!);
        }

        return btoa(binary);
    } catch {
        console.warn("Loupe export: font fetch failed, exporting without embedded font");
        return null;
    }
};

const resolveVarAttrs = (liveEl: Element, cloneEl: Element): void => {
    for (const attr of PRESENTATION_ATTRS) {
        const raw = liveEl.getAttribute(attr);

        if (raw === null || !raw.trim().startsWith("var(")) {
            continue;
        }

        const varName = extractVarName(raw);

        if (varName === null) {
            continue;
        }

        const resolved = window.getComputedStyle(liveEl).getPropertyValue(varName).trim();

        if (resolved.length === 0) {
            console.warn(`Loupe export: could not resolve ${varName} for ${attr}`);
            continue;
        }

        cloneEl.setAttribute(attr, resolved);
    }

    if (!isStyledElement(liveEl) || !isStyledElement(cloneEl)) {
        return;
    }

    for (const prop of ALLOWED_PROPS) {
        if (!liveEl.style.getPropertyValue(prop).includes("var(")) {
            continue;
        }

        const resolved = window.getComputedStyle(liveEl).getPropertyValue(prop).trim();

        if (resolved.length === 0) {
            console.warn(`Loupe export: could not resolve ${prop}`);
            continue;
        }

        cloneEl.style.setProperty(prop, resolved);
    }
};

const inlineStyles = (liveEl: Element, cloneEl: Element): void => {
    if (!isStyledElement(liveEl) || !isStyledElement(cloneEl)) {
        return;
    }

    for (const sheet of document.styleSheets) {
        let rules: CSSRuleList;

        try {
            rules = sheet.cssRules;
        } catch {
            continue;
        }

        for (const rule of rules) {
            if (!(rule instanceof CSSStyleRule) || rule.selectorText.startsWith("@")) {
                continue;
            }

            try {
                if (!liveEl.matches(rule.selectorText)) {
                    continue;
                }
            } catch {
                continue;
            }

            for (let i = 0; i < rule.style.length; i += 1) {
                const prop = rule.style.item(i);
                cloneEl.style.setProperty(prop, rule.style.getPropertyValue(prop));
            }
        }
    }

    if (cloneEl.style.length === 0) {
        const computed = window.getComputedStyle(liveEl);

        for (const prop of ALLOWED_PROPS) {
            const value = computed.getPropertyValue(prop);

            if (value.length > 0) {
                cloneEl.style.setProperty(prop, value);
            }
        }
    }
};

const walkLiveAndClone = (liveRoot: Element, cloneRoot: Element): void => {
    const liveWalker = document.createTreeWalker(liveRoot, NodeFilter.SHOW_ELEMENT);
    const cloneWalker = document.createTreeWalker(cloneRoot, NodeFilter.SHOW_ELEMENT);

    let liveNode: Node | null = liveWalker.currentNode;
    let cloneNode: Node | null = cloneWalker.currentNode;

    while (liveNode !== null && cloneNode !== null) {
        if (isElement(liveNode) && isElement(cloneNode)) {
            resolveVarAttrs(liveNode, cloneNode);
            inlineStyles(liveNode, cloneNode);
        }

        liveNode = liveWalker.nextNode();
        cloneNode = cloneWalker.nextNode();
    }
};

const mergeLabelLayer = (container: HTMLElement, clone: SVGElement): void => {
    const labelSvg = container.querySelector("svg.chart-labels-layer");

    if (labelSvg === null || !(labelSvg instanceof SVGElement)) {
        return;
    }

    const cloneLabelSvg = labelSvg.cloneNode(true) as SVGElement;
    walkLiveAndClone(labelSvg, cloneLabelSvg);

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "exported-labels");

    for (const child of [...cloneLabelSvg.childNodes]) {
        group.appendChild(child);
    }

    clone.appendChild(group);
};

const stripDataAttributes = (root: Node): void => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

    let node: Node | null = walker.currentNode;

    while (node !== null) {
        if (isElement(node)) {
            for (const attr of [...node.attributes]) {
                if (attr.name.startsWith("data-")) {
                    node.removeAttribute(attr.name);
                }
            }
        }

        node = walker.nextNode();
    }
};

const createSvgText = (
    x: number,
    y: number,
    text: string,
    fontFamily: string,
    fontSize: number,
    textAnchor: "start" | "middle",
): SVGTextElement => {
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(y));
    label.setAttribute("fill", AT_RISK_FILL);
    label.setAttribute("font-family", fontFamily);
    label.setAttribute("font-size", String(fontSize));
    label.setAttribute("text-anchor", textAnchor);
    label.textContent = text;

    return label;
};

const atRiskTableToSvg = (
    tableEl: HTMLTableElement,
    plotWidth: number,
    marginLeft: number,
    fontFamily: string,
    fontSize: number,
): SVGGElement => {
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "km-at-risk-export");

    const captionText =
        tableEl.querySelector("caption")?.textContent?.trim().toUpperCase() ?? "AT RISK";
    const timeHeaders = [...tableEl.querySelectorAll("thead th[scope='col']")]
        .slice(1)
        .map((cell) => cell.textContent?.trim() ?? "");
    const bodyRows = [...tableEl.querySelectorAll("tbody tr")];
    const colCount = timeHeaders.length;
    const dataWidth = Math.max(0, plotWidth - marginLeft - AT_RISK_ROW_HEADER_WIDTH);
    const colWidth = colCount > 0 ? dataWidth / colCount : 0;
    const tableTopY = AT_RISK_HEADER_TOP_Y;

    group.appendChild(
        createSvgText(marginLeft, fontSize + 2, captionText, fontFamily, fontSize, "start"),
    );

    const headerY = tableTopY + fontSize;

    for (let i = 0; i < timeHeaders.length; i += 1) {
        const x = marginLeft + AT_RISK_ROW_HEADER_WIDTH + (i + 0.5) * colWidth;
        group.appendChild(
            createSvgText(x, headerY, timeHeaders[i] ?? "", fontFamily, fontSize, "middle"),
        );
    }

    for (let rowIndex = 0; rowIndex < bodyRows.length; rowIndex += 1) {
        const row = bodyRows[rowIndex]!;
        const rowHeader = row.querySelector("th[scope='row']")?.textContent?.trim() ?? "";
        const cells = [...row.querySelectorAll("td")];
        const rowY = headerY + AT_RISK_ROW_HEIGHT + rowIndex * AT_RISK_ROW_HEIGHT;

        group.appendChild(
            createSvgText(
                marginLeft,
                rowY,
                rowHeader,
                fontFamily,
                fontSize,
                "start",
            ),
        );

        for (let colIndex = 0; colIndex < cells.length; colIndex += 1) {
            const x = marginLeft + AT_RISK_ROW_HEADER_WIDTH + (colIndex + 0.5) * colWidth;
            const value = cells[colIndex]?.textContent?.trim() ?? "";
            group.appendChild(
                createSvgText(x, rowY, value, fontFamily, fontSize, "middle"),
            );
        }
    }

    return group;
};

const appendAtRiskTable = (
    container: HTMLElement,
    liveSvg: SVGElement,
    clone: SVGElement,
): void => {
    const tableEl = findAtRiskTable(container);

    if (tableEl === null) {
        return;
    }

    const plotWidth = liveSvg.getBoundingClientRect().width;
    const plotHeight =
        Number.parseFloat(liveSvg.getAttribute("height") ?? "") ||
        liveSvg.getBoundingClientRect().height;
    const marginLeft = Number.parseFloat(window.getComputedStyle(tableEl).marginLeft) || 0;
    const fontFamily = window.getComputedStyle(liveSvg).fontFamily || "ui-monospace, monospace";
    const bodyRowCount = tableEl.querySelectorAll("tbody tr").length;
    const extraHeight = measureAtRiskExportHeight(bodyRowCount, AT_RISK_FONT_SIZE);
    const atRiskGroup = atRiskTableToSvg(
        tableEl,
        plotWidth,
        marginLeft,
        fontFamily,
        AT_RISK_FONT_SIZE,
    );

    atRiskGroup.setAttribute("transform", `translate(0, ${plotHeight})`);
    clone.appendChild(atRiskGroup);

    const newHeight = plotHeight + extraHeight;
    clone.setAttribute("height", String(newHeight));

    const viewBox = clone.getAttribute("viewBox");

    if (viewBox !== null) {
        const parts = viewBox.split(/[\s,]+/).map(Number);

        if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
            clone.setAttribute("viewBox", `0 0 ${parts[2]} ${newHeight}`);
        }
    }
};

const embedFont = async (
    clone: SVGElement,
    options: ExportOptions | undefined,
): Promise<void> => {
    if (options?.fontUrl === undefined || options.fontFamily === undefined) {
        return;
    }

    const base64 = await fetchFontAsBase64(options.fontUrl);

    if (base64 === null) {
        return;
    }

    const style = document.createElementNS(SVG_NS, "style");
    style.textContent =
        `@font-face{font-family:'${options.fontFamily}';` +
        `src:url(data:font/woff2;base64,${base64}) format('woff2');}`;
    clone.insertBefore(style, clone.firstChild);
};

const downloadSvg = (xml: string, title: string): void => {
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = toSvgFilename(title);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

export async function exportSvg(
    container: HTMLElement,
    title: string,
    options?: ExportOptions,
): Promise<void> {
    const svgEl = getPlotSvg(container);
    const clone = svgEl.cloneNode(true) as SVGElement;

    // INVARIANT: clone must not be mutated between cloneNode(true) and
    // walkLiveAndClone — walker assumes structural parity with the live tree.
    walkLiveAndClone(svgEl, clone);
    mergeLabelLayer(container, clone);
    stripDataAttributes(clone);
    appendAtRiskTable(container, svgEl, clone);
    await embedFont(clone, options);

    let xml = "";

    try {
        xml = new XMLSerializer().serializeToString(clone);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to serialize SVG.";
        throw new ExportError("SERIALIZE_FAILED", message);
    }

    downloadSvg(`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, title);
}
