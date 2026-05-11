import type { ColumnRole, Mapping } from "@/app/providers";

type RoleEntry = readonly [ColumnRole, string | undefined];

/**
 * Reassign a column to a role, clearing any other column previously holding that role
 * and any other role previously held by this column. Picking "ignore" just removes the
 * column's assignment. This is the "duplicate auto-reset" rule from LOUPE-04.
 */
export const assignRole = (mapping: Mapping, column: string, role: ColumnRole): Mapping => {
    const next: Mapping = {};
    for (const [r, c] of Object.entries(mapping) as readonly RoleEntry[]) {
        if (c !== undefined && c !== column && r !== role) {
            next[r] = c;
        }
    }
    if (role !== "ignore") {
        next[role] = column;
    }

    return next;
};
