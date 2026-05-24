import type { KMGroup } from "./kaplanMeier.types";

/** Patients still at risk at t: nAtRisk from the first step at or after t. */
export const nAtRiskAtTime = (group: KMGroup, t: number): number => {
    for (const point of group.points) {
        if (point.t >= t) {
            return point.nAtRisk;
        }
    }

    return 0;
};
