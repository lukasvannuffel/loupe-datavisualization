"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useAppState } from "@/app/providers";
import { detectPhiColumns } from "@/lib/ai/phi/detect";
import { toAiColumns } from "@/lib/ai/toAiColumns";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RingLoader } from "@/components/primitives/RingLoader";
import { countAssigned, validateMapping } from "@/lib/roles";

import { IntentBox } from "./IntentBox";
import { MappingTable } from "./MappingTable";
import { PhiWarning } from "./PhiWarning";
import { TransparencyPanel } from "./TransparencyPanel";
import { useRecommendation } from "./useRecommendation";
import { useUploadMap } from "./useUploadMap";
import { ValidationStrip } from "./ValidationStrip";

export const UploadMap = (): JSX.Element => {
    const router = useRouter();
    const {
        intent,
        mapping,
        setChartKind,
        setChartSlug,
        setIntent,
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
        onSuccess: (payload, resetRecommendation) => {
            setReceipt(payload.receipt);
            setChartKind(payload.chartKind);
            setChartSlug(payload.chartKind);
            setSelectionMode("ai");
            resetRecommendation();
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

    const continueDisabled =
        phiBlocks ||
        validation.status !== "valid" ||
        intent.trim().length === 0 ||
        state.status === "loading";

    const handleContinue = (): void => {
        void run(payload);
    };

    const showPhi = phi.length > 0 && !dismissPhi && !sentAnywayConfirmed;

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

                {state.status === "error" && (
                    <div className="map-ai-error" role="alert">
                        <div className="map-ai-error-title">Couldn&apos;t generate a recommendation.</div>
                        <p className="muted">{state.message}</p>
                        <div className="map-ai-error-actions">
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => run(payload)}>
                                Try again
                            </button>
                            <button type="button" className="btn btn--quiet btn--sm" onClick={() => router.push("/library")}>
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
                                    <RingLoader /> Generating…
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
