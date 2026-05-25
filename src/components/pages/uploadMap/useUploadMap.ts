import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAppState, type ColumnRole } from "@/app/providers";
import type { ColumnInference } from "@/lib/parser/inference.types";
import { brandRows } from "@/lib/parser/types";
import type { Mapping } from "@/lib/roles/types";
import { autoMapColumns } from "@/lib/roles";

import { assignRole } from "./uploadMap.types";

type UploadMapApi = {
    readonly dismissPhi: boolean;
    readonly inferences: readonly ColumnInference[];
    readonly onChangeRole: (column: string, role: ColumnRole) => void;
    readonly onRenameColumns: (
        pairs: ReadonlyArray<{ readonly oldName: string; readonly newName: string }>,
    ) => void;
    readonly onReplace: () => void;
    readonly setDismissPhi: (next: boolean) => void;
    readonly setSentAnywayConfirmed: (next: boolean) => void;
    readonly sentAnywayConfirmed: boolean;
};

export const useUploadMap = (): UploadMapApi => {
    const router = useRouter();
    const { hydrated, mapping, setMapping, dataset, setDataset, clearDataset } = useAppState();
    const autoMapped = useRef<boolean>(false);
    const [sentAnywayConfirmed, setSentAnywayConfirmed] = useState<boolean>(false);
    const [dismissPhi, setDismissPhi] = useState<boolean>(false);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        if (dataset === null) {
            router.replace("/upload");
        }
    }, [hydrated, dataset, router]);

    useEffect(() => {
        if (!hydrated || autoMapped.current || dataset === null || Object.keys(mapping).length > 0) {
            return;
        }
        autoMapped.current = true;
        const seeded = autoMapColumns(dataset.inferences);
        if (Object.keys(seeded).length > 0) {
            setMapping(seeded);
        }
    }, [hydrated, dataset, mapping, setMapping]);

    const inferences = useMemo<readonly ColumnInference[]>(
        () => dataset?.inferences ?? [],
        [dataset],
    );

    const onRenameColumns = (
        pairs: ReadonlyArray<{ readonly oldName: string; readonly newName: string }>,
    ): void => {
        if (dataset === null || pairs.length === 0) {
            return;
        }

        const renameMap = new Map<string, string>(pairs.map((p) => [p.oldName, p.newName]));

        const updatedInferences = dataset.inferences.map((i) => {
            const next = renameMap.get(i.name);

            return next !== undefined ? { ...i, name: next } : i;
        });

        const updatedRows = dataset.rows.map((row) => {
            const nextRow: Record<string, string> = { ...row };
            for (const [oldName, newName] of renameMap) {
                if (oldName in nextRow) {
                    nextRow[newName] = nextRow[oldName];
                    delete nextRow[oldName];
                }
            }

            return nextRow;
        });

        const updatedMapping: Mapping = { ...mapping };

        for (const role of Object.keys(updatedMapping) as ColumnRole[]) {
            const col = updatedMapping[role];

            if (col !== undefined) {
                const mapped = renameMap.get(col);

                if (mapped !== undefined) {
                    updatedMapping[role] = mapped;
                }
            }
        }

        setDataset(updatedInferences, brandRows(updatedRows));
        setMapping(updatedMapping);
    };

    return {
        dismissPhi,
        inferences,
        onChangeRole: (column, role) => setMapping(assignRole(mapping, column, role)),
        onRenameColumns,
        onReplace: () => {
            clearDataset();
            setMapping({});
            router.push("/upload");
        },
        setDismissPhi,
        setSentAnywayConfirmed,
        sentAnywayConfirmed,
    };
};
