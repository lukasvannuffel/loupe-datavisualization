import Link from "next/link";

import { Eyebrow } from "@/components/primitives/Eyebrow";

import { IconPlus } from "./dashboardIcons";
import styles from "./dashboard.module.css";

type DashboardHeaderProps = {
    readonly displayName: string;
    readonly chartCount: number;
};

export const DashboardHeader = ({
    displayName,
    chartCount,
}: DashboardHeaderProps): JSX.Element => {
    const figureLabel = chartCount === 1 ? "figure" : "figures";

    return (
        <header className={styles.dashHead}>
            <div>
                <Eyebrow>Workspace · {displayName}</Eyebrow>
                <h1 className="serif">
                    Your charts
                    <span className={styles.count}>
                        {chartCount} {figureLabel}
                    </span>
                </h1>
            </div>
            <div className={styles.dashHeadActions}>
                <Link href="/upload" className="btn btn--primary btn--sm">
                    <IconPlus /> New chart
                </Link>
            </div>
        </header>
    );
};
