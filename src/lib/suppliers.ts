// src/lib/suppliers.ts
import type { Prisma, PrismaClient, Supplier } from "@prisma/client";
import { SupplierCapabilityType } from "@prisma/client";

const UNKNOWN_SUPPLIER_NAME = "Unknown Supplier";

export const SupplierCapabilityLabels: Record<SupplierCapabilityType, string> = {
    [SupplierCapabilityType.Electrical]: "Electrical",
    [SupplierCapabilityType.Plumbing]: "Plumbing",
    [SupplierCapabilityType.Solar]: "Solar",
    [SupplierCapabilityType.GeneralMaintenance]: "General maintenance",
    [SupplierCapabilityType.HVAC]: "HVAC",
    [SupplierCapabilityType.Security]: "Security",
    [SupplierCapabilityType.Landscaping]: "Landscaping",
    [SupplierCapabilityType.Cleaning]: "Cleaning",
    [SupplierCapabilityType.Other]: "Other",
};

type Client = PrismaClient | Prisma.TransactionClient;

type SupplierSummary = Supplier & {
    capabilities: { capability: SupplierCapabilityType }[];
};

export async function ensureUnknownSupplier(client: Client, accountId: string): Promise<string> {
    const existing = await client.supplier.findFirst({
        where: { accountId, name: UNKNOWN_SUPPLIER_NAME },
        select: { id: true },
    });

    if (existing) return existing.id;

    const created = await client.supplier.create({
        data: {
            accountId,
            name: UNKNOWN_SUPPLIER_NAME,
            description: "Placeholder supplier for assets without a known source.",
            isSales: false,
            isMaintenance: false,
            notes: "Auto-generated fallback supplier.",
        },
        select: { id: true },
    });

    return created.id;
}

export async function ensureUnknownSupplierForAccounts(client: Client, accountIds: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    for (const accountId of accountIds) {
        results[accountId] = await ensureUnknownSupplier(client, accountId);
    }
    return results;
}

export async function listAccountSuppliers(client: Client, accountId: string): Promise<SupplierSummary[]> {
    return client.supplier.findMany({
        where: { accountId },
        include: { capabilities: true },
        orderBy: [{ name: "asc" }],
    });
}

export function capabilitiesToSet(values: readonly string[]): SupplierCapabilityType[] {
    const valid = new Set(Object.values(SupplierCapabilityType));
    const seen = new Set<SupplierCapabilityType>();
    const result: SupplierCapabilityType[] = [];
    for (const value of values) {
        if (valid.has(value as SupplierCapabilityType)) {
            const cast = value as SupplierCapabilityType;
            if (!seen.has(cast)) {
                seen.add(cast);
                result.push(cast);
            }
        }
    }
    return result;
}


