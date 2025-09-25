// src/lib/asset-types.ts
import { ParentType } from "@prisma/client";

/**
 * Expand your AssetType enum in Prisma as needed (Vehicles + Household).
 * Example enum values assumed:
 * Car, Tractor, Motorbike, Trailer, Appliance, Electronics, Furniture, Tool, Fixture, Other
 */
export const VEHICLE_TYPES = ["Car", "Tractor", "Motorbike", "Trailer"] as const;
export const HOUSEHOLD_TYPES = ["Appliance", "Electronics", "Furniture", "Tool", "Fixture"] as const;
export const COMMON_TYPES = ["Other"] as const;

export const ASSET_TYPES_BY_PARENT: Record<ParentType, readonly string[]> = {
    [ParentType.Vehicle]: [...VEHICLE_TYPES, ...COMMON_TYPES],
    [ParentType.Property]: [...HOUSEHOLD_TYPES, ...COMMON_TYPES],
    [ParentType.PersonContainer]: [...HOUSEHOLD_TYPES, ...COMMON_TYPES],
    [ParentType.OtherContainer]: [...HOUSEHOLD_TYPES, ...VEHICLE_TYPES, ...COMMON_TYPES],
};

export function allowedAssetTypesFor(parentType: ParentType): string[] {
    return ASSET_TYPES_BY_PARENT[parentType] ?? [...COMMON_TYPES];
}

export function isAssetTypeAllowed(parentType: ParentType, assetType: string | null | undefined): boolean {
    if (!assetType) return false;
    return allowedAssetTypesFor(parentType).includes(assetType);
}
