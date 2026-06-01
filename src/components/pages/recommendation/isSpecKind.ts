import type { ChartSlug } from "@/components/charts/chartPreviews";
import type { ChartSpec } from "@/lib/chartSpec/types";

export const isSpecKind = (slug: ChartSlug): slug is ChartSpec["kind"] =>
    slug === "km" || slug === "barError" || slug === "box" || slug === "xy";
