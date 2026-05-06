import { Library } from "@/components/pages/Library";
import { requireUser } from "@/utils/supabase/server";

const LibraryPage = async (): Promise<JSX.Element> => {
    await requireUser();

    return <Library />;
};

export default LibraryPage;
