import { ProjectStyle } from "@/components/pages/ProjectStyle";
import { requireUser } from "@/utils/supabase/server";

type ProjectStylePageProps = {
    params: Promise<{ id: string }>;
};

const ProjectStylePage = async ({ params }: ProjectStylePageProps): Promise<JSX.Element> => {
    const user = await requireUser();
    const { id } = await params;

    // TODO: when projects are fetched server-side, assert ownership here
    // (e.g. select 1 from projects where id = $id and owner_id = user.id)
    // and 404 on miss. Until then, requireUser() only proves authn, not authz.
    void user;

    return <ProjectStyle projectId={id} />;
};

export default ProjectStylePage;
