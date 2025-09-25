"use client";

import { useEffect, useMemo, useState } from "react";
import { ParentType } from "@prisma/client";
import { allowedAssetTypesFor } from "@/lib/asset-types";
import { ParentTypeLabels, parentTypeOrder } from "@/lib/parents";

export type ParentOption = {
    id: string;
    label: string;
};

export type ParentsByType = Record<ParentType, ParentOption[]>;

type Props = {
    parents: ParentsByType;
};

function firstAvailableType(parents: ParentsByType): ParentType {
    for (const type of parentTypeOrder) {
        if ((parents[type] ?? []).length > 0) return type;
    }
    return ParentType.Property;
}

export default function ParentAndTypeFields({ parents }: Props) {
    const initialType = useMemo(() => firstAvailableType(parents), [parents]);
    const [parentType, setParentType] = useState<ParentType>(initialType);

    const optionsForType = parents[parentType] ?? [];
    const [parentId, setParentId] = useState<string>(() => optionsForType[0]?.id ?? "");

    useEffect(() => {
        const available = parents[parentType] ?? [];
        if (!available.find((opt) => opt.id === parentId)) {
            setParentId(available[0]?.id ?? "");
        }
    }, [parentType, parentId, parents]);

    const allowedTypes = useMemo(() => allowedAssetTypesFor(parentType), [parentType]);
    const [assetType, setAssetType] = useState<string>(allowedTypes[0] ?? "");

    useEffect(() => {
        if (!allowedTypes.includes(assetType)) {
            setAssetType(allowedTypes[0] ?? "");
        }
    }, [allowedTypes, assetType]);

    const disableParentSelection = optionsForType.length === 0;

    return (
        <>
            <div className="grid grid-2">
                <div className="field">
                    <label htmlFor="parentType" className="label">
                        Parent type <span className="req">*</span>
                    </label>
                    <select
                        id="parentType"
                        name="parentType"
                        required
                        value={parentType}
                        onChange={(event) => setParentType(event.target.value as ParentType)}
                    >
                        {parentTypeOrder.map((type) => (
                            <option key={type} value={type} disabled={(parents[type] ?? []).length === 0}>
                                {ParentTypeLabels[type]}
                                {(parents[type] ?? []).length === 0 ? " (none)" : ""}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="parentId" className="label">
                        Container <span className="req">*</span>
                    </label>
                    <select
                        id="parentId"
                        name="parentId"
                        required
                        value={parentId}
                        onChange={(event) => setParentId(event.target.value)}
                        disabled={disableParentSelection}
                    >
                        {disableParentSelection ? (
                            <option value="" disabled>
                                No options for this type
                            </option>
                        ) : (
                            optionsForType.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))
                        )}
                    </select>
                </div>
            </div>

            <div className="field">
                <label htmlFor="assetType" className="label">
                    Asset type <span className="req">*</span>
                </label>
                <select
                    id="assetType"
                    name="assetType"
                    required
                    value={assetType}
                    onChange={(event) => setAssetType(event.target.value)}
                    disabled={allowedTypes.length === 0}
                >
                    {allowedTypes.length === 0 ? (
                        <option value="" disabled>
                            No types available
                        </option>
                    ) : (
                        allowedTypes.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))
                    )}
                </select>
            </div>
        </>
    );
}
