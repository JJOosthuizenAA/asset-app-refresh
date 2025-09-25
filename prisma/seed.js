// prisma/seed.js (CommonJS + async IIFE works with `node prisma/seed.js`)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async function main() {
    try {
        // Account
        const account = await prisma.account.upsert({
            where: { code: "ACC-1001" },
            update: {},
            create: { code: "ACC-1001", name: "Primary Account" },
        });

        // Portfolio
        const portfolio = await prisma.portfolio.upsert({
            where: { id: "seed-portfolio-1" },
            update: {},
            create: {
                id: "seed-portfolio-1",
                name: "Home",
                type: "Property",
                accountId: account.id,
            },
        });

        // Asset
        const asset = await prisma.asset.upsert({
            where: { id: "seed-asset-1" },
            update: {},
            create: {
                id: "seed-asset-1",
                name: "Front Door",
                portfolioId: portfolio.id,
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
