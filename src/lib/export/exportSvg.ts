import { toSvgFilename } from "./filenameHelper";
import { fetchFontAsBase64 } from "./fontCache";
import { appendAtRiskTable, appendLegend } from "./svgTableHelpers";

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
    url: "/fonts/source-serif-4-latin.woff2",
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
const VAR_NAME_PATTERN = /^var\(\s*(--[^,)]+)/;

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

const embedFont = async (
    clone: SVGElement,
    options: ExportOptions | undefined,
): Promise<void> => {
    if (options?.fontUrl === undefined || options.fontFamily === undefined) {
        return;
    }

    const entry = await fetchFontAsBase64(options.fontUrl, options.fontFamily, "normal", "400");

    if (entry === null) {
        return;
    }

    const style = document.createElementNS(SVG_NS, "style");
    style.textContent =
        `@font-face{font-family:'${options.fontFamily}';` +
        `src:url(data:font/woff2;base64,${entry.base64}) format('woff2');}`;
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

export async function exportSvgString(
    container: HTMLElement,
    _title: string,
    options?: ExportOptions,
): Promise<string> {

    const svgEl = getPlotSvg(container);
    const clone = svgEl.cloneNode(true) as SVGElement;

    // INVARIANT: clone must not be mutated between cloneNode(true) and
    // walkLiveAndClone — walker assumes structural parity with the live tree.
    walkLiveAndClone(svgEl, clone);
    mergeLabelLayer(container, clone);
    stripDataAttributes(clone);
    appendAtRiskTable(container, svgEl, clone);
    appendLegend(container, svgEl, clone);
    await embedFont(clone, options);

    let xml = "";

    try {
        xml = new XMLSerializer().serializeToString(clone);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to serialize SVG.";
        throw new ExportError("SERIALIZE_FAILED", message);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

export async function exportSvg(
    container: HTMLElement,
    title: string,
    options?: ExportOptions,
): Promise<void> {
    const xml = await exportSvgString(container, title, options);
    downloadSvg(xml, title);
}
