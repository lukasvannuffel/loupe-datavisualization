type RecommendationActionsPanelProps = {
    readonly canCustomize: boolean;
    readonly onCustomize: () => void;
    readonly onSwitchToManual: () => void;
};

export const RecommendationActionsPanel = ({
    canCustomize,
    onCustomize,
    onSwitchToManual,
}: RecommendationActionsPanelProps): JSX.Element => (
    <aside className="rec-panel" aria-label="Recommendation actions">
        <div className="rec-panel-status">
            <span>
                <span className="ring ring--xs" />
                Auto-saved locally
            </span>
            <span className="mono">cfg · 4f7a · 2 changes</span>
        </div>

        <section className="rec-panel-zone" aria-labelledby="rec-next-heading">
            <h3 id="rec-next-heading" className="rec-panel-label">
                Next step
            </h3>
            <button
                type="button"
                className="btn btn--primary btn--lg rec-panel-primary"
                disabled={!canCustomize}
                title={!canCustomize ? "Complete the column mapping first" : undefined}
                onClick={onCustomize}
            >
                Customize <span className="arrow">→</span>
            </button>
        </section>

        <hr className="rec-panel-divider" />

        <section className="rec-panel-zone" aria-labelledby="rec-approach-heading">
            <h3 id="rec-approach-heading" className="rec-panel-label">
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
    </aside>
);
