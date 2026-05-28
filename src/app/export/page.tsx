import { Export } from "@/components/pages/Export";
import { getChart } from "@/app/charts/actions";
import { requireUser } from "@/utils/supabase/server";

type ExportPageProps = {
    readonly searchParams?: Promise<{ readonly id?: string }>;
};

const ExportPage = async ({ searchParams }: ExportPageProps): Promise<JSX.Element> => {
    await requireUser();
    const resolvedSearchParams = (await searchParams) ?? {};
    const chartId = resolvedSearchParams.id;
    const loadedChart = chartId === undefined ? null : await getChart(chartId);

    return <Export initialChart={loadedChart} initialChartId={chartId ?? null} />;
};

export default ExportPage;
