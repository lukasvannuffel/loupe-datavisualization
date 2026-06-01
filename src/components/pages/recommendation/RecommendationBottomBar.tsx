type RecommendationBottomBarProps = {
    readonly canCustomize: boolean;
    readonly onCustomize: () => void;
    readonly onOpenOverride: () => void;
    readonly onSwitchToManual: () => void;
};

export const RecommendationBottomBar = ({
    canCustomize,
    onCustomize,
    onOpenOverride,
    onSwitchToManual,
}: RecommendationBottomBarProps): JSX.Element => (
    <div className="rec-bottombar">
        <div className="container rec-bottombar-inner">
            <div className="rec-bottombar-meta">
                <span>
                    <span className="ring ring--xs" />
                    Auto-saved locally
                </span>
                <span className="mono">cfg · 4f7a · 2 changes</span>
            </div>
            <div className="rec-bottombar-actions">
                <button
                    type="button"
                    className="btn btn--quiet btn--sm"
                    data-testid="switch-to-manual"
                    onClick={onSwitchToManual}
                >
                    Pick a chart myself
                </button>
                <button type="button" className="btn btn--quiet btn--sm" onClick={onOpenOverride}>
                    Try a different chart
                </button>
                <button type="button" className="btn btn--ghost btn--sm">
                    Save to project
                </button>
                {/* disabled handles both click and keyboard; aria-disabled removed (redundant on <button>). */}
                <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={!canCustomize}
                    title={!canCustomize ? "Complete the column mapping first" : undefined}
                    onClick={onCustomize}
                >
                    Customize <span className="arrow">→</span>
                </button>
            </div>
        </div>
    </div>
);
