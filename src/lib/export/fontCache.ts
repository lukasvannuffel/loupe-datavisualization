export interface FontEntry {
    readonly base64: string;
    readonly family: string;
    readonly style: string;
    readonly weight: string;
}

const cache = new Map<string, FontEntry>();

/** Clears the in-memory font cache — for Vitest isolation only. */
export function resetFontCacheForTests(): void {
    cache.clear();
}

export async function fetchFontAsBase64(
    url: string,
    family: string,
    style: string,
    weight: string,
): Promise<FontEntry | null> {
    const cached = cache.get(url);

    if (cached !== undefined) {
        return cached;
    }

    try {
        const res = await fetch(url);

        if (!res.ok) {
            console.warn(`Loupe export: font fetch failed for ${url}`);
            return null;
        }

        const bytes = new Uint8Array(await res.arrayBuffer());
        let binary = "";

        for (let i = 0; i < bytes.length; i += 1) {
            binary += String.fromCharCode(bytes[i]!);
        }

        const entry: FontEntry = { base64: btoa(binary), family, style, weight };
        cache.set(url, entry);
        return entry;
    } catch {
        console.warn(`Loupe export: font fetch failed for ${url}`);
        return null;
    }
}
