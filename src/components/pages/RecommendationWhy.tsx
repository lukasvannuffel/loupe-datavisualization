import type { ComponentType } from "react";

import type { ChartPreviewProps } from "@/components/charts/types";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import type { Receipt } from "@/lib/chartSpec/types";

type RecommendationWhyProps = {
    readonly AltPreview: ComponentType<ChartPreviewProps> | null;
    readonly onUseAlt: () => void;
    readonly phase: number;
    readonly primaryAlt: Receipt["alternatives"][number] | undefined;
    readonly receipt: Receipt;
};

export const RecommendationWhy = ({
    AltPreview,
    onUseAlt,
    phase,
    primaryAlt,
    receipt,
}: RecommendationWhyProps): JSX.Element => (
    <div className={"rec-why rec-why-stage" + (phase >= 3 ? " is-visible" : "")}>
        <Eyebrow>Why this chart</Eyebrow>
        <h4>{receipt.recommendation.headline}</h4>
        <div className="rec-why-block">
            <span className="label">{receipt.recommendation.becauseTitle}</span>
            <p>{receipt.recommendation.because}</p>
        </div>
        <div className="rec-why-block">
            <span className="label">{receipt.recommendation.handlesTitle}</span>
            <p>{receipt.recommendation.handles}</p>
        </div>
        {primaryAlt !== undefined && AltPreview !== null ? (
            <div className="rec-why-block">
                <span className="label">We considered, then set aside</span>
                <div className="rec-alt">
                    <div className="rec-alt-mini">
                        <AltPreview h={36} w={64} />
                    </div>
                    <div>
                        <div className="rec-alt-name">{primaryAlt.name}</div>
                        <div className="rec-alt-reason">{primaryAlt.reason}</div>
                    </div>
                    <button type="button" onClick={onUseAlt}>
                        Use instead →
                    </button>
                </div>
            </div>
        ) : null}
        <div className="rec-why-block">
            <span className="label">{receipt.testsTitle}</span>
            <p className="rec-why-block-tests">
                {receipt.tests.map((t, i) => (
                    <span key={`${t.label}-${i}`}>
                        · {t.label}
                        {t.notes !== undefined ? ` — ${t.notes}` : ""}
                        {i < receipt.tests.length - 1 ? <br /> : null}
                    </span>
                ))}
            </p>
        </div>
    </div>
);
