import { cookies } from "next/headers";

import { DashboardEmpty } from "@/app/dashboard/DashboardEmpty";
import { DashboardLoadError } from "@/app/dashboard/DashboardLoadError";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { listCharts } from "@/lib/charts/listCharts";
import { displayNameFor, loadProfile } from "@/lib/profile";
import { createClient, requireUser } from "@/utils/supabase/server";

const DashboardPage = async (): Promise<JSX.Element> => {
    const user = await requireUser();
    const result = await listCharts();

    if (!result.ok) {
        return (
            <main className="container page-enter">
                <DashboardLoadError />
            </main>
        );
    }

    if (result.charts.length === 0) {
        return (
            <main className="container page-enter">
                <DashboardEmpty variant="zero" />
            </main>
        );
    }

    const supabase = createClient(await cookies());
    const profile = await loadProfile(supabase, user.id);
    const displayName = displayNameFor(profile, user.email ?? null);

    return (
        <main className="container">
            <DashboardShell initialCharts={result.charts} displayName={displayName} />
        </main>
    );
};

export default DashboardPage;
