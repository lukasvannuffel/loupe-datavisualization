import { PageSkeleton } from "@/components/primitives/PageSkeleton";

const DashboardLoading = (): JSX.Element => {
    return (
        <main className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
            <PageSkeleton lines={4} />
        </main>
    );
};

export default DashboardLoading;
