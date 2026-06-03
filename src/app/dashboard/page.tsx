import { Eyebrow } from "@/components/primitives/Eyebrow";
import { listCharts } from "@/lib/charts/listCharts";
import { requireUser } from "@/utils/supabase/server";

import { DashboardChartGrid } from "./DashboardChartGrid";
import { DashboardLoadError } from "./DashboardLoadError";
import { EmptyState } from "./EmptyState";
import styles from "./dashboard.module.css";

const DashboardPage = async (): Promise<JSX.Element> => {
    await requireUser();
    const result = await listCharts();

    return (
        <main className={`container ${styles.page}`}>
            <Eyebrow>Dashboard</Eyebrow>
            <h1 className={`serif ${styles.heading}`}>Your charts</h1>
            {!result.ok ? (
                <DashboardLoadError />
            ) : result.charts.length === 0 ? (
                <EmptyState />
            ) : (
                <DashboardChartGrid charts={result.charts} />
            )}
        </main>
    );
};

export default DashboardPage;
