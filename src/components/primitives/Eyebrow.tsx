import type { ReactNode } from "react";

type EyebrowProps = {
    children: ReactNode;
    withDot?: boolean;
};

export const Eyebrow = ({ children, withDot = true }: EyebrowProps): JSX.Element => (
    <div className="eyebrow">
        {withDot && <span className="dot" />}
        {children}
    </div>
);
