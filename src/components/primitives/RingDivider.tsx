export const RingDivider = (): JSX.Element => (
    <div className="divider-ring">
        <svg width="14" height="14" viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="6.25" fill="none" stroke="var(--hairline-strong)" strokeWidth="0.75" />
            <circle cx="7" cy="7" r="1.4" fill="var(--ink)" />
        </svg>
    </div>
);
