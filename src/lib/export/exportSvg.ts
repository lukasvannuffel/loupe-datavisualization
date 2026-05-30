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

const SVG_NS = "http://www.w3.org/2000/svg";

const isElement = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;

const isStyledElement = (node: Element): node is HTMLElement | SVGElement =>
    node instanceof HTMLElement || node instanceof SVGElement;

const getPlotSvg = (container: HTMLElement): SVGElement => {
    const directSvgs = [...container.children].filter(
        (child): child is SVGElement => child instanceof SVGElement,
    );

    if (directSvgs.length !== 1) {
        throw new ExportError("NO_SVG", "Chart container must contain exactly one plot SVG.");
    }

    return directSvgs[0]!;
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

const mergeLabelLayer = (container: HTMLElement, clone: SVGElement): void => {
    const labelSvg = container.querySelector("svg.chart-labels-layer");

    if (labelSvg === null) {
        return;
    }

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "exported-labels");

    for (const child of [...labelSvg.childNodes]) {
        group.appendChild(child.cloneNode(true));
    }

    clone.appendChild(group);
};

const stripReactArtifacts = (root: Node): void => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

    let node: Node | null = walker.currentNode;

    while (node !== null) {
        if (isElement(node)) {
            for (const attr of [...node.attributes]) {
                if (attr.name === "data-reactroot" || attr.name.startsWith("data-react")) {
                    node.removeAttribute(attr.name);
                }
            }
        }

        node = walker.nextNode();
    }
};

const inlineStyles = (root: Node): void => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

    let node: Node | null = walker.currentNode;

    while (node !== null) {
        if (isElement(node) && isStyledElement(node)) {
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
                        if (!node.matches(rule.selectorText)) {
                            continue;
                        }
                    } catch {
                        continue;
                    }

                    for (let i = 0; i < rule.style.length; i += 1) {
                        const prop = rule.style.item(i);
                        node.style.setProperty(prop, rule.style.getPropertyValue(prop));
                    }
                }
            }

            if (node.style.length === 0) {
                const computed = getComputedStyle(node);

                for (const prop of ALLOWED_PROPS) {
                    const value = computed.getPropertyValue(prop);

                    if (value.length > 0) {
                        node.style.setProperty(prop, value);
                    }
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

    mergeLabelLayer(container, clone);
    stripReactArtifacts(clone);
    inlineStyles(clone);
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
