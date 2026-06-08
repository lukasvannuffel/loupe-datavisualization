type RecommendationActionsPanelProps = {
    readonly canCustomize: boolean;
    readonly changeCount: number;
    readonly configHash: string | null;
    readonly onCustomize: () => void;
    readonly onSwitchToManual: () => void;
};

const formatChangeCount = (count: number): string =>
    `${count} ${count === 1 ? "change" : "changes"}`;

export const RecommendationActionsPanel = ({
    canCustomize,
    changeCount,
    configHash,
    onCustomize,
    onSwitchToManual,
}: RecommendationActionsPanelProps): JSX.Element => (
    <section className="actions-panel rec-panel" aria-label="Recommendation actions">
        <div className="actions-panel__status">
            <span>
                <span className="ring ring--xs" />
                Auto-saved locally
            </span>
            <span className="mono">
                {configHash ?? "…"} · {formatChangeCount(changeCount)}
            </span>
        </div>

        <section className="actions-panel__zone" aria-labelledby="rec-next-heading">
            <h3 id="rec-next-heading" className="actions-panel__label">
                Next step
            </h3>
            <button
                type="button"
                className="btn btn--primary btn--lg actions-panel__primary"
                disabled={!canCustomize}
                title={!canCustomize ? "Complete the column mapping first" : undefined}
                onClick={onCustomize}
            >
                Customize <span className="arrow">→</span>
            </button>
        </section>

        <hr className="actions-panel__divider" />

        <section className="actions-panel__zone" aria-labelledby="rec-approach-heading">
            <h3 id="rec-approach-heading" className="actions-panel__label">
                Change approach
            </h3>
            <button
                type="button"
                className="btn btn--quiet btn--sm"
                data-testid="switch-to-manual"
                onClick={onSwitchToManual}
            >
                Pick a chart myself
            </button>
        </section>
    </section>
);
