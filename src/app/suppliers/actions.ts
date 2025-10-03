"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { capabilitiesToSet, ensureUnknownSupplier } from "@/lib/suppliers";

type ParsedAddress = {
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string | null;
    latitude: number | null;
    longitude: number | null;
};

function parseString(value: FormDataEntryValue | null): string | null {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
    return String(value ?? "") === "on";
}

function parseNumber(value: FormDataEntryValue | null): number | null {
    const raw = parseString(value);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseAddress(formData: FormData): ParsedAddress {
    return {
        addressLine1: parseString(formData.get("addressLine1")),
        addressLine2: parseString(formData.get("addressLine2")),
        city: parseString(formData.get("city")),
        region: parseString(formData.get("region")),
        postalCode: parseString(formData.get("postalCode")),
        countryCode: parseString(formData.get("countryCode")),
        latitude: parseNumber(formData.get("latitude")),
        longitude: parseNumber(formData.get("longitude")),
    };
}

export async function createSupplierAction(formData: FormData) {
    const accountId = await requireAccountId();

    const name = parseString(formData.get("name"));
    if (!name) throw new Error("Supplier name is required");

    const capabilityValues = formData.getAll("capabilities").map((value) => String(value));
    const capabilities = capabilitiesToSet(capabilityValues);
    const address = parseAddress(formData);
    const serviceRadiusKm = parseNumber(formData.get("serviceRadiusKm"));

    const newSupplierId = await prisma.$transaction(async (tx) => {
        const supplier = await tx.supplier.create({
            data: {
                accountId,
                name,
                description: parseString(formData.get("description")),
                contactName: parseString(formData.get("contactName")),
                contactEmail: parseString(formData.get("contactEmail")),
                contactPhone: parseString(formData.get("contactPhone")),
                registrationNumber: parseString(formData.get("registrationNumber")),
                isSales: parseBoolean(formData.get("isSales")),
                isMaintenance: parseBoolean(formData.get("isMaintenance")),
                isActive: parseBoolean(formData.get("isActive")),
                serviceRadiusKm,
                notes: parseString(formData.get("notes")),
                ...address,
            },
            select: { id: true },
        });

        if (capabilities.length) {
            await tx.supplierCapability.createMany({
                data: capabilities.map((capability) => ({ supplierId: supplier.id, capability })),
            });
        }

        return supplier.id;
    });

    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${newSupplierId}`);
    redirect("/suppliers?ok=created");
}

export async function updateSupplierAction(formData: FormData) {
    const accountId = await requireAccountId();

    const supplierId = parseString(formData.get("supplierId"));
    if (!supplierId) throw new Error("Supplier id is required");

    const owned = await prisma.supplier.findFirst({
        where: { id: supplierId, accountId },
        select: { id: true },
    });
    if (!owned) throw new Error("Supplier not found");

    const name = parseString(formData.get("name"));
    if (!name) throw new Error("Supplier name is required");

    const capabilityValues = formData.getAll("capabilities").map((value) => String(value));
    const capabilities = capabilitiesToSet(capabilityValues);
    const serviceRadiusKm = parseNumber(formData.get("serviceRadiusKm"));
    const address = parseAddress(formData);

    await prisma.$transaction(async (tx) => {
        await tx.supplier.update({
            where: { id: supplierId },
            data: {
                name,
                description: parseString(formData.get("description")),
                contactName: parseString(formData.get("contactName")),
                contactEmail: parseString(formData.get("contactEmail")),
                contactPhone: parseString(formData.get("contactPhone")),
                registrationNumber: parseString(formData.get("registrationNumber")),
                isSales: parseBoolean(formData.get("isSales")),
                isMaintenance: parseBoolean(formData.get("isMaintenance")),
                isActive: parseBoolean(formData.get("isActive")),
                serviceRadiusKm,
                notes: parseString(formData.get("notes")),
                ...address,
            },
        });

        await tx.supplierCapability.deleteMany({ where: { supplierId } });
        if (capabilities.length) {
            await tx.supplierCapability.createMany({
                data: capabilities.map((capability) => ({ supplierId, capability })),
            });
        }
    });

    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${supplierId}`);
    redirect(`/suppliers/${supplierId}?ok=updated`);
}

export async function deleteSupplierAction(formData: FormData) {
    const accountId = await requireAccountId();
    const supplierId = parseString(formData.get("supplierId"));
    if (!supplierId) throw new Error("Supplier id is required");

    const owned = await prisma.supplier.findFirst({
        where: { id: supplierId, accountId },
        select: { id: true },
    });
    if (!owned) throw new Error("Supplier not found");

    const fallbackId = await ensureUnknownSupplier(prisma, accountId);
    if (supplierId === fallbackId) {
        throw new Error("Fallback supplier cannot be deleted");
    }

    await prisma.$transaction(async (tx) => {
        await tx.asset.updateMany({
            where: { accountId, primarySupplierId: supplierId },
            data: { primarySupplierId: fallbackId },
        });
        await tx.maintenanceTask.updateMany({
            where: { preferredSupplierId: supplierId },
            data: { preferredSupplierId: fallbackId, selfServiceSelected: false },
        });
        await tx.supplierCapability.deleteMany({ where: { supplierId } });
        await tx.supplier.delete({ where: { id: supplierId } });
    });

    revalidatePath("/suppliers");
    redirect("/suppliers?ok=deleted");
}

export type { SupplierCapabilityType } from "@prisma/client";


