"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Eyebrow } from "@/components/primitives/Eyebrow";
import { useAppState } from "@/app/providers";

/**
 * Placeholder for the manual chart picker. The picker UI itself ships in the
 * next prompt; this page exists so the routing and state plumbing land in one
 * reviewable change.
 *
 * Funnel guard: if the user arrives here without first opting into manual mode
 * (e.g. direct deep link), we bounce them back to `/recommend/choose` so the
 * decision is recorded before they see manual UI.
 */
export const RecommendManual = (): JSX.Element => {
    const router = useRouter();
    const { hydrated, selectionMode, setSelectionMode } = useAppState();

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        if (selectionMode !== "manual") {
            router.replace("/recommend/choose");
        }
    }, [hydrated, selectionMode, router]);

    const onSwitchToAi = (): void => {
        setSelectionMode("ai");
        router.push("/recommend");
    };

    return (
        <div className="rec-page page-enter">
            <div className="container container--narrow">
                <div className="upload-head">
                    <div>
                        <Eyebrow>Step 3 · Manual pick</Eyebrow>
                        <h1 className="upload-title">Pick your chart.</h1>
                    </div>
                </div>
                <p className="muted">
                    The manual chart picker lands in the next iteration. Your column mapping
                    and finding are preserved — you can switch back to the AI flow without
                    losing either.
                </p>
                <div className="map-continue">
                    <button
                        type="button"
                        className="btn btn--ghost btn--lg"
                        data-testid="switch-to-ai"
                        onClick={onSwitchToAi}
                    >
                        ← Use the AI recommendation instead
                    </button>
                </div>
            </div>
        </div>
    );
};
