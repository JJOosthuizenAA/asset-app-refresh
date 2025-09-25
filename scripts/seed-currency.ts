// scripts/seed-currency.ts (quick one-off)
import { prisma } from "../src/lib/prisma";

async function main() {
    const accounts = await prisma.account.findMany();
    for (const a of accounts) {
        await prisma.account.update({
            where: { id: a.id },
            data: {
                countryCode: a.countryCode ?? "ZA",
                currencyCode: a.currencyCode ?? "ZAR",
            },
        });
    }
    console.log("Seeded country/currency on existing accounts.");
}

main().finally(() => process.exit(0));
