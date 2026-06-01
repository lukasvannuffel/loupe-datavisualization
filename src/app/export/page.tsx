import { Export } from "@/components/pages/Export";
import { getChart } from "@/app/charts/actions";
import { requireUser } from "@/utils/supabase/server";

/** Wizard chartSpec lives in client sessionStorage — null guard is in Export.tsx, not here. */

type ExportPageProps = {
    readonly searchParams?: Promise<{ readonly id?: string }>;
};

const ExportPage = async ({ searchParams }: ExportPageProps): Promise<JSX.Element> => {
    await requireUser();
    const resolvedSearchParams = (await searchParams) ?? {};
    const chartId = resolvedSearchParams.id;

    if (chartId === undefined) {
        return <Export initialChart={null} initialChartId={null} initialLoadReason={null} />;
    }

    const loaded = await getChart(chartId);

    if (!loaded.ok) {
        return (
            <Export
                initialChart={null}
                initialChartId={chartId}
                initialLoadReason={loaded.reason}
            />
        );
    }

    return (
        <Export
            initialChart={loaded.chart}
            initialChartId={chartId}
            initialLoadReason={null}
        />
    );
};

export default ExportPage;
