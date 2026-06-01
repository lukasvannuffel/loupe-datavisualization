import { useEffect, useState } from "react";

import { inferErrorTypeFromReceipt } from "@/lib/chartSpec/aggregators/errorBars";
import { patchSpecKind } from "@/lib/chartSpec/customizations/patchSpec";
import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";

export const useRecommendationLiveSpec = (
    spec: ChartSpec,
    receipt: Receipt,
): ChartSpec => {
    const mergeReceiptErrorType = (next: ChartSpec): ChartSpec => {
        if (next.kind !== "barError") {
            return next;
        }

        return patchSpecKind(next, { errorBarType: inferErrorTypeFromReceipt(receipt) });
    };

    const [liveSpec, setLiveSpec] = useState<ChartSpec>(() => mergeReceiptErrorType(spec));

    useEffect(() => {
        setLiveSpec(mergeReceiptErrorType(spec));
    }, [receipt, spec]);

    return liveSpec;
};
