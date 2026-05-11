type CoverageChipProps = {
    readonly nullCount: number;
};

export const CoverageChip = ({ nullCount }: CoverageChipProps): JSX.Element => {
    if (nullCount === 0) {
        return <span className="coverage-chip is-ok">complete</span>;
    }

    return <span className="coverage-chip is-warn">missing: {nullCount}</span>;
};
