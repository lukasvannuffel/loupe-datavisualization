export const formatRelativeDate = (iso: string): string => {
    const diffMs = new Date(iso).getTime() - Date.now();
    const minuteMs = 60_000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (Math.abs(diffMs) < hourMs) {
        return rtf.format(Math.round(diffMs / minuteMs), "minute");
    }

    if (Math.abs(diffMs) < dayMs) {
        return rtf.format(Math.round(diffMs / hourMs), "hour");
    }

    return rtf.format(Math.round(diffMs / dayMs), "day");
};

export const normalizeTag = (raw: string): string =>
    raw.trim().toLowerCase().replace(/\s+/g, "-");

export const exportHref = (chartId: string): string => `/export?id=${chartId}`;

export const shareChartUrl = async (chartId: string): Promise<boolean> => {
    const url = `${window.location.origin}${exportHref(chartId)}`;

    try {
        await navigator.clipboard.writeText(url);

        return true;
    } catch {
        return false;
    }
};

export type DashboardSort = "recent" | "name" | "type";

export type DashboardView = "grid" | "list";
