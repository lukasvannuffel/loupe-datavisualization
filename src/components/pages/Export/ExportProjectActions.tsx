import { RingLoader } from "@/components/primitives/RingLoader";

type ExportProjectActionsProps = {
    readonly onRetryReceiptBuild: () => void;
    readonly onSave: () => void;
    readonly onStartNew: () => void;
    readonly receiptBuildFailed: boolean;
    readonly receiptBuilding: boolean;
    readonly saving: boolean;
};

export const ExportProjectActions = ({
    onRetryReceiptBuild,
    onSave,
    onStartNew,
    receiptBuildFailed,
    receiptBuilding,
    saving,
}: ExportProjectActionsProps): JSX.Element => (
    <section className="export-panel-zone" aria-labelledby="export-project-heading">
        <h3 id="export-project-heading" className="export-panel-label">
            Project
        </h3>
        {receiptBuildFailed ? (
            <p className="muted small" role="alert">
                Save receipt is not ready.{" "}
                <button type="button" className="btn btn--quiet btn--sm" onClick={onRetryReceiptBuild}>
                    Try again
                </button>
            </p>
        ) : null}
        {receiptBuilding ? (
            <p className="muted small" role="status">
                <RingLoader /> Preparing save receipt…
            </p>
        ) : null}
        <div className="export-project-row">
            <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={saving || receiptBuilding}
                onClick={onSave}
            >
                {saving ? "Saving…" : "Save to project"}
            </button>
            <button type="button" className="btn btn--quiet btn--sm" onClick={onStartNew}>
                Start a new chart <span className="arrow">→</span>
            </button>
        </div>
    </section>
);
