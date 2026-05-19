import type { ChartSpec, OverrideEvent } from "@/lib/chartSpec/types";

const KIND_SHORT: Record<ChartSpec["kind"], string> = {
    barError: "BarError",
    box: "Box",
    km: "KM",
    xy: "XY",
};

const formatTime = (iso: string): string => {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");

    return `${h}:${m}`;
};

export const formatOverrideHistory = (events: ReadonlyArray<OverrideEvent>): string =>
    events
        .map((e) => `${KIND_SHORT[e.from]} → ${KIND_SHORT[e.to]} at ${formatTime(e.at)}`)
        .join(" · ");
