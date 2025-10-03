// prisma/seed.js (CommonJS + async IIFE works with `node prisma/seed.js`)
const { PrismaClient, ParentType } = require("@prisma/client");
const prisma = new PrismaClient();

async function ensureUnknownSupplier(accountId) {
    const existing = await prisma.supplier.findFirst({
        where: { accountId, name: "Unknown Supplier" },
        select: { id: true },
    });

    if (existing) return existing.id;

    const created = await prisma.supplier.create({
        data: {
            accountId,
            name: "Unknown Supplier",
            description: "Auto-generated fallback supplier",
            isSales: false,
            isMaintenance: false,
            notes: "Created by prisma/seed.js",
        },
        select: { id: true },
    });

    return created.id;
}

(async function main() {
    try {
        // Account
        const account = await prisma.account.upsert({
            where: { code: "ACC-1001" },
            update: {},
            create: { code: "ACC-1001", name: "Primary Account" },
        });

        // Account address
        await prisma.accountAddress.upsert({
            where: { accountId: account.id },
            update: {
                addressLine1: "123 Main Road",
                city: "Cape Town",
                region: "Western Cape",
                postalCode: "8000",
                countryCode: "ZA",
            },
            create: {
                accountId: account.id,
                addressLine1: "123 Main Road",
                city: "Cape Town",
                region: "Western Cape",
                postalCode: "8000",
                countryCode: "ZA",
            },
        });

        // Property container
        const property = await prisma.property.upsert({
            where: { id: "seed-property-1" },
            update: {
                name: "Home",
                label: "Primary Residence",
            },
            create: {
                id: "seed-property-1",
                accountId: account.id,
                name: "Home",
                label: "Primary Residence",
                city: "Cape Town",
                region: "Western Cape",
                countryCode: "ZA",
            },
        });

        // Unknown supplier for this account
        const supplierId = await ensureUnknownSupplier(account.id);

        // Asset
        const asset = await prisma.asset.upsert({
            where: { id: "seed-asset-1" },
            update: {},
            create: {
                id: "seed-asset-1",
                accountId: account.id,
                parentType: ParentType.Property,
                parentId: property.id,
                name: "Front Door",
                category: "Structure",
                location: "Entrance",
                primarySupplierId: supplierId,
            },
        });

        // Task (due within 30 days)
        const dueSoon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        await prisma.maintenanceTask.upsert({
            where: { id: "seed-task-1" },
            update: {},
            create: {
                id: "seed-task-1",
                title: "Lubricate hinges",
                notes: "Use silicone spray",
                dueDate: dueSoon,
                completed: false,
                assetId: asset.id,
                preferredSupplierId: supplierId,
            },
        });

        // Warranty (expiring within 30 days)
        const expSoon = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
        await prisma.warranty.upsert({
            where: { id: "seed-warranty-1" },
            update: {},
            create: {
                id: "seed-warranty-1",
                name: "Hardware Warranty",
                provider: "HomeShield",
                policyNo: "HS-2024-001",
                expiresAt: expSoon,
                assetId: asset.id,
            },
        });

        console.log("✅ Seed complete");
    } catch (e) {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
})();