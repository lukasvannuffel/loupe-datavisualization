import { ProjectStyle } from "@/components/pages/ProjectStyle";

type ProjectStylePageProps = {
    params: Promise<{ id: string }>;
};

const ProjectStylePage = async ({ params }: ProjectStylePageProps): Promise<JSX.Element> => {
    const { id } = await params;

    return <ProjectStyle projectId={id} />;
};

export default ProjectStylePage;
