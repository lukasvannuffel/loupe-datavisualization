import styles from "./pageSkeleton.module.css";

type PageSkeletonProps = {
    readonly lines?: number;
};

export const PageSkeleton = ({ lines = 3 }: PageSkeletonProps): JSX.Element => {
    return (
        <div className={styles.wrap} aria-busy="true" aria-label="Loading">
            {Array.from({ length: lines }, (_, index) => (
                <div
                    key={index}
                    className={styles.line}
                    style={{ width: index === 0 ? "40%" : index === lines - 1 ? "70%" : "100%" }}
                />
            ))}
        </div>
    );
};
