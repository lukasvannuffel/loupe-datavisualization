import { cookies } from "next/headers";

import { Dashboard } from "@/components/pages/Dashboard";
import { affiliationFromUser, greetingNameFromUser } from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";

const DashboardPage = async (): Promise<JSX.Element> => {
    const supabase = createClient(await cookies());
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const displayName = user !== null ? greetingNameFromUser(user) : "there";
    const affiliation = user !== null ? affiliationFromUser(user) : null;

    return <Dashboard displayName={displayName} affiliation={affiliation} />;
};

export default DashboardPage;
