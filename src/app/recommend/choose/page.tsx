import { RecommendChoose } from "@/components/pages/recommendChoose/RecommendChoose";
import { requireUser } from "@/utils/supabase/server";

const RecommendChoosePage = async (): Promise<JSX.Element> => {
    await requireUser();

    return <RecommendChoose />;
};

export default RecommendChoosePage;
