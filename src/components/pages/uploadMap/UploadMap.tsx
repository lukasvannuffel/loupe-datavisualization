"use client";

import { Eyebrow } from "@/components/primitives/Eyebrow";
import { useAppState } from "@/app/providers";
import { countAssigned } from "@/lib/roles";

import { IntentBox } from "./IntentBox";
import { MappingTable } from "./MappingTable";
import { ValidationStrip } from "./ValidationStrip";
import { useUploadMap } from "./useUploadMap";

export const UploadMap = (): JSX.Element => {
    const { intent, setIntent, mapping } = useAppState();
    const { inferences, validation, continueDisabled, onChangeRole, onReplace, onContinue } =
        useUploadMap();

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

                <div className="map-continue">
                    <button
                        type="button"
                        className="btn btn--primary btn--lg"
                        disabled={continueDisabled}
                        onClick={onContinue}
                    >
                        Get recommendation <span className="arrow">→</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
