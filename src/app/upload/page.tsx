import { Upload } from "@/components/pages/Upload";
import { requireUser } from "@/utils/supabase/server";

const UploadPage = async (): Promise<JSX.Element> => {
    await requireUser();

    return <Upload />;
};

export default UploadPage;
