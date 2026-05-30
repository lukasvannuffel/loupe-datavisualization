// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchFontAsBase64, resetFontCacheForTests } from "@/lib/export/fontCache";

const FONT_URL = "https://example.com/font.woff2";

describe("fetchFontAsBase64", () => {
    afterEach(() => {
        resetFontCacheForTests();
        vi.restoreAllMocks();
    });

    it("returns null and warns on fetch failure", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error("network blocked")),
        );

        const entry = await fetchFontAsBase64(FONT_URL, "Inter", "normal", "400");

        expect(entry).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
            `Loupe export: font fetch failed for ${FONT_URL}`,
        );
    });

    it("returns cached entry on second call without re-fetching", async () => {
        const fetchSpy = vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: async () => new Uint8Array([65, 66]).buffer,
        });
        vi.stubGlobal("fetch", fetchSpy);

        const first = await fetchFontAsBase64(FONT_URL, "Inter", "normal", "400");
        const second = await fetchFontAsBase64(FONT_URL, "Inter", "normal", "400");

        expect(first).toEqual(second);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
});
