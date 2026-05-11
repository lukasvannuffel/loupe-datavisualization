import type { PrimaryType } from "@/lib/parser/inference.types";
import type { ColumnRole } from "@/app/providers";
import { ASSIGNABLE_ROLES, ROLE_LABELS, ROLE_TYPE_COMPATIBILITY } from "@/lib/roles";

type RoleSelectProps = {
    readonly columnName: string;
    readonly primaryType: PrimaryType;
    readonly value: ColumnRole;
    readonly onChange: (next: ColumnRole) => void;
};

export const RoleSelect = ({
    columnName,
    primaryType,
    value,
    onChange,
}: RoleSelectProps): JSX.Element => {
    const eligible = ASSIGNABLE_ROLES.filter((role) =>
        ROLE_TYPE_COMPATIBILITY[role].includes(primaryType),
    );

    return (
        <select
            className="map-role"
            aria-label={`Chart role for ${columnName}`}
            value={value}
            onChange={(e) => onChange(e.target.value as ColumnRole)}
        >
            <option value="ignore">{ROLE_LABELS.ignore}</option>
            {eligible.map((role) => (
                <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                </option>
            ))}
        </select>
    );
};
