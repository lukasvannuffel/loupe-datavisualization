import type { ColumnInference } from "@/lib/parser/inference.types";
import type { ColumnRole, Mapping } from "@/app/providers";
import { roleForColumn } from "@/lib/roles";

import { MappingRow } from "./MappingRow";

type MappingTableProps = {
    readonly inferences: readonly ColumnInference[];
    readonly mapping: Mapping;
    readonly onChange: (column: string, role: ColumnRole) => void;
};

export const MappingTable = ({
    inferences,
    mapping,
    onChange,
}: MappingTableProps): JSX.Element => (
    <div className="map-table" role="table" aria-label="Column to chart role mapping">
        <div className="map-row map-row--head" role="row">
            <span>Column</span>
            <span>Type</span>
            <span>Coverage</span>
            <span>Chart role</span>
        </div>
        {inferences.map((col) => (
            <MappingRow
                key={col.name}
                column={col}
                role={roleForColumn(mapping, col.name)}
                onChangeRole={(role) => onChange(col.name, role)}
            />
        ))}
    </div>
);
