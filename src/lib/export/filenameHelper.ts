const MAX_BASENAME_LENGTH = 50;

export function toSvgFilename(title: string): string {
    const kebab = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (kebab.length === 0) {
        return "chart.svg";
    }

    const parts = kebab.split("-");
    let basename = parts[0] ?? "";

    for (let i = 1; i < parts.length; i += 1) {
        const next = `${basename}-${parts[i]}`;

        if (next.length > MAX_BASENAME_LENGTH) {
            break;
        }

        basename = next;
    }

    if (basename.length > MAX_BASENAME_LENGTH) {
        basename = basename.slice(0, MAX_BASENAME_LENGTH).replace(/-+$/g, "");
    }

    return basename.length === 0 ? "chart.svg" : `${basename}.svg`;
}
