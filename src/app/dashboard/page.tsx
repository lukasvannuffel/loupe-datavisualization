import { cookies } from "next/headers";

import { Dashboard } from "@/components/pages/Dashboard";
import { greetingNameFor, loadProfile } from "@/lib/profile";
import { createClient, requireUser } from "@/utils/supabase/server";

const DashboardPage = async (): Promise<JSX.Element> => {
    const user = await requireUser();
    const supabase = createClient(await cookies());
    const profile = await loadProfile(supabase, user.id);

    return (
        <Dashboard
            displayName={greetingNameFor(profile, user.email ?? null)}
            affiliation={profile.affiliation}
        />
    );
};

export default DashboardPage;
