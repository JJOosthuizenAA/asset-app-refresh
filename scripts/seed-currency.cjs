// scripts/seed-currency.cjs
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const accounts = await prisma.account.findMany({
        select: { id: true, countryCode: true, currencyCode: true },
    });

    for (const a of accounts) {
        const country = a.countryCode ?? "ZA";
        const currency = a.currencyCode ?? "ZAR";
        if (a.countryCode !== country || a.currencyCode !== currency) {
            await prisma.account.update({
                where: { id: a.id },
                data: { countryCode: country, currencyCode: currency },
            });
            console.log(`Updated ${a.id} → ${country}/${currency}`);
        }
    }
    console.log("Seed complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
