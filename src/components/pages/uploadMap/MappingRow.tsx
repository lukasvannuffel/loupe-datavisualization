import type { ColumnInference } from "@/lib/parser/inference.types";
import type { ColumnRole } from "@/app/providers";

import { CoverageChip } from "./CoverageChip";
import { RoleSelect } from "./RoleSelect";
import { TypeBadge } from "./TypeBadge";

type MappingRowProps = {
    readonly column: ColumnInference;
    readonly role: ColumnRole;
    readonly onChangeRole: (role: ColumnRole) => void;
};

export const MappingRow = ({ column, role, onChangeRole }: MappingRowProps): JSX.Element => {
    const samples = column.sampleValues.slice(0, 3).join(", ");
    const detail = column.uniqueCount > 0 ? `${column.uniqueCount} distinct` : undefined;

    return (
        <div className="map-row" role="row">
            <div className="map-cell map-cell--name">
                <span className="cell-eyebrow">Column</span>
                <span className="mono map-col-name">{column.name}</span>
                {samples.length > 0 && (
                    <span className="map-col-samples muted">ex: {samples}</span>
                )}
            </div>
            <div className="map-cell">
                <span className="cell-eyebrow">Type</span>
                <TypeBadge
                    primaryType={column.primaryType}
                    semanticTag={column.semanticTag}
                    detail={detail}
                />
            </div>
            <div className="map-cell">
                <span className="cell-eyebrow">Coverage</span>
                <CoverageChip nullCount={column.nullCount} />
            </div>
            <div className="map-cell">
                <span className="cell-eyebrow">Chart role</span>
                <RoleSelect
                    columnName={column.name}
                    primaryType={column.primaryType}
                    value={role}
                    onChange={onChangeRole}
                />
            </div>
        </div>
    );
};
