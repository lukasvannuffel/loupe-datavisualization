import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAppState, type ColumnRole } from "@/app/providers";
import type { ColumnInference } from "@/lib/parser/inference.types";
import { autoMapColumns } from "@/lib/roles";

import { assignRole } from "./uploadMap.types";

type UploadMapApi = {
    readonly dismissPhi: boolean;
    readonly inferences: readonly ColumnInference[];
    readonly onChangeRole: (column: string, role: ColumnRole) => void;
    readonly onRenameColumn: (oldName: string, newName: string) => void;
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
        const seeded = autoMapColumns(dataset);
        if (Object.keys(seeded).length > 0) {
            setMapping(seeded);
        }
    }, [hydrated, dataset, mapping, setMapping]);

    const inferences = useMemo<readonly ColumnInference[]>(() => dataset ?? [], [dataset]);

    const onRenameColumn = (oldName: string, newName: string): void => {
        if (dataset === null) {
            return;
        }

        const updatedInferences = dataset.map((i) =>
            i.name === oldName ? { ...i, name: newName } : i,
        );
        const updatedMapping: typeof mapping = { ...mapping };

        for (const role of Object.keys(updatedMapping) as ColumnRole[]) {
            if (updatedMapping[role] === oldName) {
                updatedMapping[role] = newName;
            }
        }

        setDataset(updatedInferences);
        setMapping(updatedMapping);
    };

    return {
        dismissPhi,
        inferences,
        onChangeRole: (column, role) => setMapping(assignRole(mapping, column, role)),
        onRenameColumn,
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
