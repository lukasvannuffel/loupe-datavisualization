import { Eyebrow } from "@/components/primitives/Eyebrow";
import { listCharts } from "@/lib/charts/listCharts";
import { requireUser } from "@/utils/supabase/server";

import { ChartCard } from "./ChartCard";
import { DashboardLoadError } from "./DashboardLoadError";
import { EmptyState } from "./EmptyState";
import styles from "./dashboard.module.css";

const DashboardPage = async (): Promise<JSX.Element> => {
    await requireUser();
    const result = await listCharts();

    return (
        <main className={`container ${styles.page}`}>
            <Eyebrow>Dashboard</Eyebrow>
            <h1 className={styles.heading}>Your charts</h1>
            {!result.ok ? (
                <DashboardLoadError />
            ) : result.charts.length === 0 ? (
                <EmptyState />
            ) : (
                <section className={styles.grid}>
                    {result.charts.map((chart) => (
                        <ChartCard key={chart.id} chart={chart} />
                    ))}
                </section>
            )}
        </main>
    );
};

export default DashboardPage;
