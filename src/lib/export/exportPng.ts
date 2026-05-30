import { EXPORT_FONTS } from "./exportFonts";
import { ExportError, exportSvgString } from "./exportSvg";
import type { FontEntry } from "./fontCache";
import { fetchFontAsBase64 } from "./fontCache";
import { toSvgFilename } from "./filenameHelper";

export interface PngExportOptions {
    readonly dpi: 300 | 600;
}

const parseViewBox = (xml: string): { readonly width: number; readonly height: number } => {
    const match = xml.match(/viewBox="([^"]+)"/);

    if (match === null) {
        throw new ExportError("SERIALIZE_FAILED", "SVG missing viewBox.");
    }

    const parts = match[1]!.trim().split(/[\s,]+/);
    const width = Number(parts[2]);
    const height = Number(parts[3]);

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        throw new ExportError("SERIALIZE_FAILED", "SVG viewBox dimensions invalid.");
    }

    return { width, height };
};

const buildFontFaceCss = (entries: readonly FontEntry[]): string =>
    entries
        .map(
            (entry) =>
                `@font-face{font-family:'${entry.family}';font-style:${entry.style};` +
                `font-weight:${entry.weight};src:url('data:font/woff2;base64,${entry.base64}') format('woff2');}`,
        )
        .join("");

const injectFontFaces = (xml: string, fontCss: string): string => {
    if (fontCss.length === 0) {
        return xml;
    }

    const styleIdx = xml.indexOf("<style");

    if (styleIdx >= 0) {
        const openEnd = xml.indexOf(">", styleIdx);
        return `${xml.slice(0, openEnd + 1)}${fontCss}${xml.slice(openEnd + 1)}`;
    }

    const svgOpenMatch = xml.match(/<svg\b[^>]*>/i);

    if (svgOpenMatch?.index === undefined) {
        throw new ExportError("SERIALIZE_FAILED", "SVG root element not found.");
    }

    const insertAt = svgOpenMatch.index + svgOpenMatch[0].length;
    return `${xml.slice(0, insertAt)}<style>${fontCss}</style>${xml.slice(insertAt)}`;
};

const loadSvgImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new ExportError("SERIALIZE_FAILED", "Failed to load SVG image."));
        img.src = url;
    });

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
    new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob === null) {
                reject(new ExportError("SERIALIZE_FAILED", "canvas toBlob returned null"));
                return;
            }

            resolve(blob);
        }, "image/png");
    });

const downloadPng = (blob: Blob, title: string): void => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = toSvgFilename(title).replace(/\.svg$/i, ".png");
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

export async function exportPng(
    container: HTMLElement,
    title: string,
    options: PngExportOptions,
): Promise<void> {
    const xml = await exportSvgString(container, title);
    const fontResults = await Promise.all(
        EXPORT_FONTS.map((font) =>
            fetchFontAsBase64(font.url, font.family, font.style, font.weight),
        ),
    );
    const fontWarning = fontResults.some((entry) => entry === null);
    const fontEntries = fontResults.filter((entry): entry is FontEntry => entry !== null);
    const svgXml = injectFontFaces(xml, buildFontFaceCss(fontEntries));
    const { width: viewBoxWidth, height: viewBoxHeight } = parseViewBox(svgXml);
    const scale = options.dpi / 96;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewBoxWidth * scale);
    canvas.height = Math.round(viewBoxHeight * scale);
    const ctx = canvas.getContext("2d");

    if (ctx === null) {
        throw new ExportError("SERIALIZE_FAILED", "Canvas 2D context unavailable.");
    }

    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, viewBoxWidth, viewBoxHeight);
    const svgBlob = new Blob([svgXml], { type: "image/svg+xml" });
    const objectUrl = URL.createObjectURL(svgBlob);

    try {
        const img = await loadSvgImage(objectUrl);
        ctx.drawImage(img, 0, 0, viewBoxWidth, viewBoxHeight);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }

    const pngBlob = await canvasToBlob(canvas);
    downloadPng(pngBlob, title);

    if (fontWarning) {
        document.dispatchEvent(new CustomEvent("loupe:font-warning"));
    }
}
