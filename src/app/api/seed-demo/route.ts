// src/app/api/seed-demo/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUnknownSupplier } from "@/lib/suppliers";
import { ParentType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toCents(n: number | null | undefined) {
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    return Math.round(n * 100);
}

export async function GET() {
    try {
        const account = await prisma.account.upsert({
            where: { id: "DEMO-ACCOUNT" },
            update: {},
            create: {
                id: "DEMO-ACCOUNT",
                code: "DEMO",
                name: "Demo Account",
                currencyCode: "ZAR",
            },
            select: { id: true, currencyCode: true },
        });

        const unknownSupplierId = await ensureUnknownSupplier(prisma, account.id);

        await prisma.accountAddress.upsert({
            where: { accountId: account.id },
            update: {
                addressLine1: "123 Demo Street",
                city: "Cape Town",
                region: "Western Cape",
                postalCode: "8000",
                countryCode: "ZA",
            },
            create: {
                accountId: account.id,
                addressLine1: "123 Demo Street",
                city: "Cape Town",
                region: "Western Cape",
                postalCode: "8000",
                countryCode: "ZA",
            },
        });

        const property = await prisma.property.upsert({
            where: { id: `${account.id}-PROPERTY` },
            update: {
                name: "Demo Home",
                label: "Primary Residence",
                city: "Cape Town",
                region: "Western Cape",
                countryCode: "ZA",
            },
            create: {
                id: `${account.id}-PROPERTY`,
                accountId: account.id,
                name: "Demo Home",
                label: "Primary Residence",
                city: "Cape Town",
                region: "Western Cape",
                countryCode: "ZA",
            },
            select: { id: true, name: true },
        });

        const assetSeed = [
            {
                name: "MacBook Pro 14",
                category: "Electronics",
                location: "Home Office",
                serial: "MBP-14-DEMO-001",
                purchaseDate: new Date("2024-07-29T12:21:09.581Z"),
                purchasePrice: 42000,
            },
            {
                name: "Canon R6 Mark II",
                category: "Camera",
                location: "Studio",
                serial: "CAN-R6M2-DEMO-001",
                purchaseDate: new Date("2024-03-10T10:00:00.000Z"),
                purchasePrice: 38000,
            },
        ];

        const assets: { id: string; name: string }[] = [];
        for (const seed of assetSeed) {
            const existing = await prisma.asset.findFirst({
                where: {
                    accountId: account.id,
                    parentType: ParentType.Property,
                    parentId: property.id,
                    name: seed.name,
                },
                select: { id: true, name: true, primarySupplierId: true },
            });

            const purchasePriceCents = toCents(seed.purchasePrice);

            if (existing) {
                if (!existing.primarySupplierId) {
                    await prisma.asset.update({
                        where: { id: existing.id },
                        data: { primarySupplierId: unknownSupplierId },
                    });
                }
                assets.push({ id: existing.id, name: existing.name });
                continue;
            }

            const created = await prisma.asset.create({
                data: {
                    accountId: account.id,
                    parentType: ParentType.Property,
                    parentId: property.id,
                    name: seed.name,
                    category: seed.category,
                    serial: seed.serial,
                    location: seed.location,
                    purchaseDate: seed.purchaseDate,
                    purchasePriceCents: purchasePriceCents ?? undefined,
                    primarySupplierId: unknownSupplierId,
                },
                select: { id: true, name: true },
            });

            assets.push(created);
        }

        for (const asset of assets) {
            const hasTask = await prisma.maintenanceTask.findFirst({
                where: { assetId: asset.id, title: "Annual Service" },
                select: { id: true },
            });
            if (!hasTask) {
                const dueDate = new Date();
                dueDate.setMonth(11, 15);
                await prisma.maintenanceTask.create({
                    data: {
                        title: "Annual Service",
                        notes: "General check & clean",
                        dueDate,
                        completed: false,
                        assetId: asset.id,
                    },
                });
            }
        }

        if (assets[0]) {
            const exists = await prisma.warranty.findFirst({
                where: { assetId: assets[0].id, name: "Standard Warranty" },
                select: { id: true },
            });
            if (!exists) {
                const expires = new Date();
                expires.setFullYear(expires.getFullYear() + 2, 6, 1);
                await prisma.warranty.create({
                    data: {
                        assetId: assets[0].id,
                        name: "Standard Warranty",
                        provider: "Acme Warranty Co.",
                        policyNo: "WAR-2024-001",
                        expiresAt: expires,
                    },
                });
            }
        }

        return NextResponse.json({
            ok: true,
            account,
            property,
            assetsCount: assets.length,
            message: "Demo data seeded.",
        });
    } catch (error: any) {
        console.error("seed-demo error", error);
        return NextResponse.json(
            { ok: false, error: String(error?.message ?? error) },
            { status: 500 }
        );
    }
}




