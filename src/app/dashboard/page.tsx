import { Eyebrow } from "@/components/primitives/Eyebrow";
import { listCharts } from "@/lib/charts/listCharts";
import { requireUser } from "@/utils/supabase/server";

import { ChartCard } from "./ChartCard";
import { EmptyState } from "./EmptyState";
import styles from "./dashboard.module.css";

const DashboardPage = async (): Promise<JSX.Element> => {
    await requireUser();
    const charts = await listCharts();

    return (
        <main className={`container ${styles.page}`}>
            <Eyebrow>Dashboard</Eyebrow>
            <h1 className={styles.heading}>Your charts</h1>
            {charts.length === 0 ? (
                <EmptyState />
            ) : (
                <section className={styles.grid}>
                    {charts.map((chart) => (
                        <ChartCard key={chart.id} chart={chart} />
                    ))}
                </section>
            )}
        </main>
    );
};

export default DashboardPage;
