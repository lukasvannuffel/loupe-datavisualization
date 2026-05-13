import { RecommendGate } from "@/components/pages/RecommendGate";
import { requireUser } from "@/utils/supabase/server";

const RecommendPage = async (): Promise<JSX.Element> => {
    await requireUser();

    return <RecommendGate />;
};

export default RecommendPage;
