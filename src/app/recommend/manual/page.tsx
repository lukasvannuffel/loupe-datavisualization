import { RecommendManual } from "@/components/pages/recommendManual/RecommendManual";
import { requireUser } from "@/utils/supabase/server";

const RecommendManualPage = async (): Promise<JSX.Element> => {
    await requireUser();

    return <RecommendManual />;
};

export default RecommendManualPage;
