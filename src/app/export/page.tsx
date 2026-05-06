import { Export } from "@/components/pages/Export";
import { requireUser } from "@/utils/supabase/server";

const ExportPage = async (): Promise<JSX.Element> => {
    await requireUser();

    return <Export />;
};

export default ExportPage;
