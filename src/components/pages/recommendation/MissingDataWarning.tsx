"use client";

import type { MissingDataInfo } from "@/lib/chartSpec/aggregators/barError.types";

type Props = { readonly info: MissingDataInfo };

export const MissingDataWarning = ({ info }: Props): JSX.Element => {
    const pct = (info.dropRate * 100).toFixed(1);

    return (
        <div className="rec-missing-warning" role="status">
            <strong>
                {info.droppedRows} rows dropped ({pct}%)
            </strong>
            <span className="muted">
                {" "}
                · {info.missingOutcomeRows} missing outcome, {info.missingGroupRows} missing group
            </span>
            <p className="muted small">
                High drop rate may indicate non-random missingness — interpret with care.
            </p>
        </div>
    );
};
