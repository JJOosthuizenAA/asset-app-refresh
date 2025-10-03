import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureUnknownSupplier, capabilitiesToSet } from "@/lib/suppliers";

function coerceString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function coerceNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true" || value === "on";
    return fallback;
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    const accountId = (session as any)?.user?.accountId as string | undefined;

    if (!accountId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch (error) {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const name = coerceString(body?.name);
    if (!name) {
        return NextResponse.json({ error: "Supplier name is required" }, { status: 422 });
    }

    const capabilityValues: string[] = Array.isArray(body?.capabilities)
        ? body.capabilities.map((value: unknown) => String(value))
        : [];
    const capabilities = capabilitiesToSet(capabilityValues);

    const fallbackSupplierId = await ensureUnknownSupplier(prisma, accountId);

    const supplier = await prisma.$transaction(async (tx) => {
        const created = await tx.supplier.create({
            data: {
                accountId,
                name,
                description: coerceString(body?.description),
                contactName: coerceString(body?.contactName),
                contactEmail: coerceString(body?.contactEmail),
                contactPhone: coerceString(body?.contactPhone),
                registrationNumber: coerceString(body?.registrationNumber),
                isSales: coerceBoolean(body?.isSales, false),
                isMaintenance: coerceBoolean(body?.isMaintenance, true),
                addressLine1: coerceString(body?.addressLine1),
                addressLine2: coerceString(body?.addressLine2),
                city: coerceString(body?.city),
                region: coerceString(body?.region),
                postalCode: coerceString(body?.postalCode),
                countryCode: coerceString(body?.countryCode),
                serviceRadiusKm: coerceNumber(body?.serviceRadiusKm),
                latitude: coerceNumber(body?.latitude),
                longitude: coerceNumber(body?.longitude),
                notes: coerceString(body?.notes),
            },
            select: {
                id: true,
                name: true,
                description: true,
                isMaintenance: true,
                isSales: true,
                city: true,
                region: true,
                postalCode: true,
                countryCode: true,
            },
        });

        if (capabilities.length) {
            await tx.supplierCapability.createMany({
                data: capabilities.map((capability) => ({ supplierId: created.id, capability })),
            });
        }

        return created;
    });

    return NextResponse.json({
        supplier: {
            ...supplier,
            capabilities,
            isFallback: supplier.id === fallbackSupplierId,
        },
    }, { status: 201 });
}
