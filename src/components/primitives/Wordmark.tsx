type WordmarkProps = {
    size?: number;
    dotted?: boolean;
};

export const Wordmark = ({ size = 21, dotted = true }: WordmarkProps): JSX.Element => (
    <span className="word" style={{ fontSize: size }}>
        Loupe
        {dotted && <span className="dot" />}
    </span>
);
