// src/lib/parents.ts
import { ParentType } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export type ParentRef = {
    type: ParentType;
    id: string;
};

export type ParentSummary = {
    id: string;
    label: string;
    type: ParentType;
};

export const ParentTypeLabels: Record<ParentType, string> = {
    [ParentType.Property]: "Property",
    [ParentType.Vehicle]: "Vehicle",
    [ParentType.PersonContainer]: "Personal",
    [ParentType.OtherContainer]: "Other",
};

export const parentTypeOrder: ParentType[] = [
    ParentType.Property,
    ParentType.Vehicle,
    ParentType.PersonContainer,
    ParentType.OtherContainer,
];

const ParentTypeRoutes: Record<ParentType, string> = {
    [ParentType.Property]: "/properties",
    [ParentType.Vehicle]: "/vehicles",
    [ParentType.PersonContainer]: "/personal",
    [ParentType.OtherContainer]: "/other",
};

export function resolveParentDisplay(ref: ParentRef | null | undefined, fallback = "Unassigned"): string {
    if (!ref) return fallback;
    return ParentTypeLabels[ref.type] ?? fallback;
}

export function parentTypeToRoute(type: ParentType): string {
    return ParentTypeRoutes[type] ?? "/";
}

export function parentRefToHref(ref: ParentRef | null | undefined): string | null {
    if (!ref) return null;
    return `${parentTypeToRoute(ref.type)}/${ref.id}`;
}

export function parseParentRef(formData: FormData): ParentRef | null {
    const typeValue = (formData.get("parentType") || "").toString().trim();
    const idValue = (formData.get("parentId") || "").toString().trim();
    if (!typeValue || !idValue) return null;
    if (!Object.values(ParentType).includes(typeValue as ParentType)) {
        throw new Error("Invalid parent type");
    }
    return { type: typeValue as ParentType, id: idValue };
}

export async function loadParentSummary(db: PrismaClient, accountId: string, ref: ParentRef): Promise<ParentSummary | null> {
    switch (ref.type) {
        case ParentType.Property: {
            const property = await db.property.findFirst({
                where: { id: ref.id, accountId },
                select: { id: true, name: true, label: true },
            });
            if (!property) return null;
            return {
                id: property.id,
                label: property.name || property.label || "Property",
                type: ParentType.Property,
            };
        }
        case ParentType.Vehicle: {
            const vehicle = await db.vehicle.findFirst({
                where: { id: ref.id, accountId },
                select: { id: true, nickname: true, make: true, model: true, year: true },
            });
            if (!vehicle) return null;
            const parts = [vehicle.nickname, vehicle.year ? String(vehicle.year) : null, vehicle.make, vehicle.model].filter(Boolean);
            return {
                id: vehicle.id,
                label: (vehicle.nickname || parts.join(" ") || "Vehicle") as string,
                type: ParentType.Vehicle,
            };
        }
        case ParentType.PersonContainer: {
            const container = await db.personContainer.findFirst({
                where: { id: ref.id, accountId },
                select: { id: true, label: true },
            });
            if (!container) return null;
            return {
                id: container.id,
                label: container.label || "Personal",
                type: ParentType.PersonContainer,
            };
        }
        case ParentType.OtherContainer:
        default: {
            const container = await db.otherContainer.findFirst({
                where: { id: ref.id, accountId },
                select: { id: true, label: true },
            });
            if (!container) return null;
            return {
                id: container.id,
                label: container.label || "Other",
                type: ParentType.OtherContainer,
            };
        }
    }
}

export async function listParentsByType(db: PrismaClient, accountId: string): Promise<Record<ParentType, ParentSummary[]>> {
    const [properties, vehicles, personal, other] = await Promise.all([
        db.property.findMany({
            where: { accountId },
            orderBy: { name: "asc" },
            select: { id: true, name: true, label: true },
        }),
        db.vehicle.findMany({
            where: { accountId },
            orderBy: [{ year: "desc" }, { nickname: "asc" }, { make: "asc" }],
            select: { id: true, nickname: true, make: true, model: true, year: true },
        }),
        db.personContainer.findMany({
            where: { accountId },
            orderBy: { label: "asc" },
            select: { id: true, label: true },
        }),
        db.otherContainer.findMany({
            where: { accountId },
            orderBy: { label: "asc" },
            select: { id: true, label: true },
        }),
    ]);

    return {
        [ParentType.Property]: properties.map((property) => ({
            id: property.id,
            label: property.name || property.label || "Property",
            type: ParentType.Property,
        })),
        [ParentType.Vehicle]: vehicles.map((vehicle) => {
            const parts = [vehicle.nickname, vehicle.year ? String(vehicle.year) : null, vehicle.make, vehicle.model].filter(Boolean);
            return {
                id: vehicle.id,
                label: (vehicle.nickname || parts.join(" ") || "Vehicle") as string,
                type: ParentType.Vehicle,
            };
        }),
        [ParentType.PersonContainer]: personal.map((container) => ({
            id: container.id,
            label: container.label || "Personal",
            type: ParentType.PersonContainer,
        })),
        [ParentType.OtherContainer]: other.map((container) => ({
            id: container.id,
            label: container.label || "Other",
            type: ParentType.OtherContainer,
        })),
    };
}
