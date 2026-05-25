import type { ComponentType } from "react";

import type { ChartPreviewProps } from "@/components/charts/types";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import type { Receipt } from "@/lib/chartSpec/types";

type RecommendationWhyProps = {
    readonly AltPreview: ComponentType<ChartPreviewProps> | null;
    readonly isDisplayOverridden: boolean;
    readonly onUseAlt: () => void;
    readonly phase: number;
    readonly primaryAlt: Receipt["alternatives"][number] | undefined;
    readonly receipt: Receipt;
    readonly updateLatestOverrideReason: (reason: string) => void;
};

export const RecommendationWhy = ({
    AltPreview,
    isDisplayOverridden,
    onUseAlt,
    phase,
    primaryAlt,
    receipt,
    updateLatestOverrideReason,
}: RecommendationWhyProps): JSX.Element => {
    const latestOverride = receipt.overrides.at(-1);
    const historicalClass = isDisplayOverridden ? " rec-why-block--historical" : "";

    return (
        <div className={"rec-why rec-why-stage" + (phase >= 3 ? " is-visible" : "")}>
            <Eyebrow>Why this chart</Eyebrow>
            <h4>{receipt.recommendation.headline}</h4>
            {isDisplayOverridden ? (
                <div className="rec-why-block">
                    <span className="label rec-section-label">Why you overrode</span>
                    <textarea
                        className="rec-override-reason"
                        value={latestOverride?.reason ?? ""}
                        onChange={(e) => updateLatestOverrideReason(e.target.value.slice(0, 500))}
                        placeholder="Optional: note your reasoning for the override."
                        maxLength={500}
                        rows={3}
                    />
                </div>
            ) : null}
            <div className={"rec-why-block" + historicalClass}>
                <span
                    className={
                        "label" + (isDisplayOverridden ? " rec-section-label rec-section-label--historical" : "")
                    }
                >
                    {isDisplayOverridden
                        ? "Original AI recommendation (historical)"
                        : receipt.recommendation.becauseTitle}
                </span>
                <p className={isDisplayOverridden ? "rec-rationale--historical" : undefined}>
                    {receipt.recommendation.because}
                </p>
            </div>
            <div className={"rec-why-block" + historicalClass}>
                <span className="label">{receipt.recommendation.handlesTitle}</span>
                <p className={isDisplayOverridden ? "rec-rationale--historical" : undefined}>
                    {receipt.recommendation.handles}
                </p>
            </div>
            {primaryAlt !== undefined && AltPreview !== null ? (
                <div className={"rec-why-block" + historicalClass}>
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
            <div className={"rec-why-block" + historicalClass}>
                <span className="label">{receipt.testsTitle}</span>
                <p className={"rec-why-block-tests" + (isDisplayOverridden ? " rec-rationale--historical" : "")}>
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
};
