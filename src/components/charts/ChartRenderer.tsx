import type { ChartSpec } from "@/lib/chartSpec/types";

import { PlaceholderRenderer } from "./PlaceholderRenderer";
import { PublicationKM } from "./PublicationKM";

type ChartRendererProps = {
    readonly kind: ChartSpec["kind"];
};

// PublicationKM is the real renderer. Other kinds use catalogue preview until LOUPE-10 lands their renderers.
export const ChartRenderer = ({ kind }: ChartRendererProps): JSX.Element => {
    if (kind === "km") {
        return <PublicationKM animated />;
    }

    return <PlaceholderRenderer kind={kind} />;
};
