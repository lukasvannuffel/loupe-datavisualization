const SVG_NS = "http://www.w3.org/2000/svg";
const EXPORT_TEXT_FILL = "#0e0e0e";
const AT_RISK_ROW_HEIGHT = 18;
const AT_RISK_ROW_HEADER_WIDTH = 72;
const AT_RISK_HEADER_TOP_Y = 32;
const AT_RISK_FONT_SIZE = 11;
const LEGEND_GAP_BELOW = 16;
const LEGEND_ROW_HEIGHT = 16;
const LEGEND_GLYPH_WIDTH = 10;
const LEGEND_GLYPH_HEIGHT = 8;
const LEGEND_GLYPH_TEXT_GAP = 4;
const LEGEND_ITEM_GAP = 20;
const LABEL_WIDTH_FACTOR = 0.6;
const VAR_NAME_PATTERN = /^var\(\s*(--[^,)]+)/;

type LegendItem = {
    readonly label: string;
    readonly liveGlyphEl: Element;
    readonly resolvedFill: string;
    readonly itemWidth: number;
};

const extractVarName = (value: string): string | null => {
    const match = value.trim().match(VAR_NAME_PATTERN);

    return match?.[1] ?? null;
};

const resolvePresentationColor = (liveEl: Element, attrName: "fill" | "stroke"): string => {
    const raw = liveEl.getAttribute(attrName) ?? "";

    if (!raw.trim().startsWith("var(")) {
        return raw;
    }

    const varName = extractVarName(raw);

    if (varName === null) {
        return raw;
    }

    const resolved = window.getComputedStyle(liveEl).getPropertyValue(varName).trim();

    if (resolved.length === 0) {
        console.warn(`Loupe export: could not resolve ${varName} for ${attrName}`);
        return raw;
    }

    return resolved;
};

const resolveLegendGlyphFill = (glyphChild: Element): string => {
    const fillAttr = glyphChild.getAttribute("fill");

    if (fillAttr !== null && fillAttr.startsWith("var(")) {
        return resolvePresentationColor(glyphChild, "fill");
    }

    const strokeAttr = glyphChild.getAttribute("stroke");

    if (strokeAttr !== null && strokeAttr.startsWith("var(")) {
        return resolvePresentationColor(glyphChild, "stroke");
    }

    return fillAttr ?? strokeAttr ?? "#000";
};

const measureAtRiskExportHeight = (bodyRowCount: number, fontSize: number): number => {
    const headerY = AT_RISK_HEADER_TOP_Y + fontSize;

    if (bodyRowCount === 0) {
        return headerY + fontSize;
    }

    const lastRowY = headerY + AT_RISK_ROW_HEIGHT + (bodyRowCount - 1) * AT_RISK_ROW_HEIGHT;

    return lastRowY + fontSize;
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
    label.setAttribute("fill", EXPORT_TEXT_FILL);
    label.setAttribute("font-family", fontFamily);
    label.setAttribute("font-size", String(fontSize));
    label.setAttribute("text-anchor", textAnchor);
    label.textContent = text;

    return label;
};

export const getCloneSvgHeight = (clone: SVGElement): number =>
    Number.parseFloat(clone.getAttribute("height") ?? "") || 0;

export const expandCloneVertical = (clone: SVGElement, extraHeight: number): void => {
    const newHeight = getCloneSvgHeight(clone) + extraHeight;
    clone.setAttribute("height", String(newHeight));

    const viewBox = clone.getAttribute("viewBox");

    if (viewBox === null) {
        return;
    }

    const parts = viewBox.split(/[\s,]+/).map(Number);

    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
        clone.setAttribute("viewBox", `0 0 ${parts[2]} ${newHeight}`);
    }
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

export const findLegendEl = (container: HTMLElement): HTMLUListElement | null => {
    const local = container.querySelector('ul[aria-label="Chart legend"]');

    if (local instanceof HTMLUListElement) {
        return local;
    }

    const parent = container.closest(".chart-surface")?.parentElement;
    const external = parent?.querySelector('ul[aria-label="Chart legend"]');

    return external instanceof HTMLUListElement ? external : null;
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

export const legendToSvg = (
    legendEl: HTMLUListElement,
    plotWidth: number,
    fontSize: number,
    fontFamily: string,
): SVGGElement | null => {
    const parsedItems: LegendItem[] = [];

    for (const li of legendEl.querySelectorAll("li")) {
        const label = li.querySelector("span")?.textContent?.trim() ?? "";

        if (label.length === 0) {
            continue;
        }

        const glyphSvg = li.querySelector("svg.chart-legend-glyph");
        const glyphChild =
            glyphSvg?.querySelector("[fill]") ?? glyphSvg?.querySelector("[stroke]");

        if (glyphChild === null || glyphChild === undefined) {
            continue;
        }

        const labelWidth = fontSize * LABEL_WIDTH_FACTOR * label.length;
        const itemWidth = LEGEND_GLYPH_WIDTH + LEGEND_GLYPH_TEXT_GAP + labelWidth;

        parsedItems.push({
            label,
            liveGlyphEl: glyphChild,
            resolvedFill: resolveLegendGlyphFill(glyphChild),
            itemWidth,
        });
    }

    if (parsedItems.length === 0) {
        return null;
    }

    const totalRowWidth =
        parsedItems.reduce((sum, item) => sum + item.itemWidth, 0) +
        (parsedItems.length - 1) * LEGEND_ITEM_GAP;
    let x = (plotWidth - totalRowWidth) / 2;
    const textY = fontSize;

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "chart-legend-export");

    for (const item of parsedItems) {
        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("x", String(x));
        rect.setAttribute("y", "0");
        rect.setAttribute("width", String(LEGEND_GLYPH_WIDTH));
        rect.setAttribute("height", String(LEGEND_GLYPH_HEIGHT));
        rect.setAttribute("fill", item.resolvedFill);
        rect.setAttribute("opacity", item.liveGlyphEl.getAttribute("opacity") ?? "0.85");
        group.appendChild(rect);

        group.appendChild(
            createSvgText(
                x + LEGEND_GLYPH_WIDTH + LEGEND_GLYPH_TEXT_GAP,
                textY,
                item.label,
                fontFamily,
                fontSize,
                "start",
            ),
        );

        x += item.itemWidth + LEGEND_ITEM_GAP;
    }

    return group;
};

export const appendAtRiskTable = (
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
    clone.setAttribute("height", String(plotHeight + extraHeight));

    const viewBox = clone.getAttribute("viewBox");

    if (viewBox !== null) {
        const parts = viewBox.split(/[\s,]+/).map(Number);

        if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
            clone.setAttribute("viewBox", `0 0 ${parts[2]} ${plotHeight + extraHeight}`);
        }
    }
};

export const appendLegend = (
    container: HTMLElement,
    liveSvg: SVGElement,
    clone: SVGElement,
): void => {
    const legendEl = findLegendEl(container);

    if (legendEl === null) {
        return;
    }

    const plotWidth =
        Number.parseFloat(clone.getAttribute("width") ?? "") || liveSvg.getBoundingClientRect().width;
    const fontFamily = window.getComputedStyle(liveSvg).fontFamily || "ui-monospace, monospace";
    const legendGroup = legendToSvg(legendEl, plotWidth, AT_RISK_FONT_SIZE, fontFamily);

    if (legendGroup === null) {
        return;
    }

    const legendY = getCloneSvgHeight(clone) + LEGEND_GAP_BELOW;
    legendGroup.setAttribute("transform", `translate(0, ${legendY})`);
    clone.appendChild(legendGroup);
    expandCloneVertical(clone, LEGEND_GAP_BELOW + LEGEND_ROW_HEIGHT);
};
