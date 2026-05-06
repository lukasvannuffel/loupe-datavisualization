import { Recommendation } from "@/components/pages/Recommendation";
import { requireUser } from "@/utils/supabase/server";

const RecommendPage = async (): Promise<JSX.Element> => {
    await requireUser();

    return <Recommendation />;
};

export default RecommendPage;
