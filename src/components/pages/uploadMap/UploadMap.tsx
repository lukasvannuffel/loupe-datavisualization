"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useAppState } from "@/app/providers";
import { detectPhiColumns } from "@/lib/ai/phi/detect";
import { toAiColumns } from "@/lib/ai/toAiColumns";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RingLoader } from "@/components/primitives/RingLoader";
import { countAssigned, validateMapping } from "@/lib/roles";
import { useToast } from "@/lib/toast/useToast";

import { IntentBox } from "./IntentBox";
import { MappingTable } from "./MappingTable";
import { PhiWarning } from "./PhiWarning";
import { TransparencyPanel } from "./TransparencyPanel";
import { useRecommendation, type RecommendationState } from "./useRecommendation";
import { useUploadMap } from "./useUploadMap";
import { ValidationStrip } from "./ValidationStrip";

type RecommendErrorCode = Extract<RecommendationState, { status: "error" }>["code"];

const recommendationErrorCopy = (
    code: RecommendErrorCode,
): { readonly description: string; readonly title: string; readonly variant: "error" | "warning" } => {
    if (code === "RATE_LIMITED") {
        return {
            description: "Wait a while, then try again or pick a chart manually.",
            title: "Too many recommendations.",
            variant: "warning",
        };
    }

    if (code === "PRIVACY_VIOLATION") {
        return {
            description: "Rename sensitive columns, then try again.",
            title: "Patient data cannot leave your device.",
            variant: "error",
        };
    }

    if (code === "VALIDATION_FAILED") {
        return {
            description: "Check your column mapping and intent, then try again.",
            title: "Could not analyse your dataset.",
            variant: "error",
        };
    }

    return {
        description: "Check your connection and try again.",
        title: "Could not get chart recommendation.",
        variant: "error",
    };
};

export const UploadMap = (): JSX.Element => {
    const router = useRouter();
    const { toast } = useToast();
    const {
        intent,
        mapping,
        setChartKind,
        setChartSlug,
        setIntent,
        setLastRecommendationFromCache,
        setReceipt,
        setSelectionMode,
    } = useAppState();
    const {
        dismissPhi,
        inferences,
        onChangeRole,
        onRenameColumns,
        onReplace,
        setDismissPhi,
        setSentAnywayConfirmed,
        sentAnywayConfirmed,
    } = useUploadMap();
    const { run, state } = useRecommendation({
        onSuccess: (rec, kind, fromCache) => {
            setReceipt(rec);
            setChartKind(kind);
            setChartSlug(kind);
            setSelectionMode("ai");
            setLastRecommendationFromCache(fromCache);
            router.push("/recommend");
        },
    });

    const payload = useMemo(
        () => ({
            columns: toAiColumns(inferences),
            intent,
            mapping,
        }),
        [inferences, intent, mapping],
    );

    const phi = useMemo(() => detectPhiColumns(inferences.map((i) => i.name)), [inferences]);

    const validation = useMemo(() => validateMapping(mapping, inferences), [mapping, inferences]);

    const phiBlocks = phi.length > 0 && !sentAnywayConfirmed;

    const rateLimited = state.status === "error" && state.code === "RATE_LIMITED";

    const continueDisabled =
        phiBlocks ||
        validation.status !== "valid" ||
        intent.trim().length === 0 ||
        state.status === "loading" ||
        rateLimited;

    const handleContinue = (): void => {
        void run(payload);
    };

    const showPhi = phi.length > 0 && !dismissPhi && !sentAnywayConfirmed;

    const errorCopy =
        state.status === "error" ? recommendationErrorCopy(state.code) : null;

    useEffect(() => {
        if (state.status !== "error") {
            return;
        }

        const copy = recommendationErrorCopy(state.code);

        toast({
            description: copy.description,
            durationMs: 0,
            title: copy.title,
            variant: copy.variant,
        });
    }, [state, toast]);

    return (
        <div className="upload-page page-enter">
            <div className="container">
                <div className="upload-head">
                    <div>
                        <Eyebrow>Step 2 · Map &amp; describe</Eyebrow>
                        <h1 className="upload-title">Tell Loupe what each column means.</h1>
                    </div>
                    <div className="upload-head-meta muted">02 / 03 · MAP &amp; DESCRIBE</div>
                </div>

                <div className="map-summary-row">
                    <span className="muted mono">
                        {inferences.length} columns detected · {countAssigned(mapping)} mapped
                    </span>
                    <button type="button" className="btn btn--quiet btn--sm" onClick={onReplace}>
                        ← Replace file
                    </button>
                </div>

                <ValidationStrip validation={validation} />

                <MappingTable inferences={inferences} mapping={mapping} onChange={onChangeRole} />

                <IntentBox intent={intent} onChange={setIntent} />

                <TransparencyPanel payload={payload} />

                {showPhi && (
                    <PhiWarning
                        matches={phi}
                        onCancel={() => setDismissPhi(true)}
                        onRenameColumns={onRenameColumns}
                        onSendAnyway={() => setSentAnywayConfirmed(true)}
                    />
                )}

                {errorCopy !== null && (
                    <div className="map-ai-error" role="alert">
                        <div className="map-ai-error-title">{errorCopy.title}</div>
                        <p className="muted">{errorCopy.description}</p>
                        <div className="map-ai-error-actions">
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                disabled={rateLimited}
                                onClick={() => run(payload)}
                            >
                                Try again
                            </button>
                            <button
                                type="button"
                                className="btn btn--quiet btn--sm"
                                onClick={() => {
                                    setSelectionMode("manual");
                                    router.push("/recommend/manual");
                                }}
                            >
                                Pick chart manually
                            </button>
                        </div>
                    </div>
                )}

                <div className="map-continue">
                    <button
                        type="button"
                        className={
                            state.status === "loading" ? "btn btn--primary btn--lg map-continue-loading" : "btn btn--primary btn--lg"
                        }
                        disabled={continueDisabled}
                        onClick={handleContinue}
                    >
                        {state.status === "loading" ? (
                            <>
                                <span className="map-continue-loader">
                                    <RingLoader /> Analysing your data…
                                </span>
                            </>
                        ) : (
                            <>
                                Get recommendation <span className="arrow">→</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
