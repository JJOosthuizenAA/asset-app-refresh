// scripts/backfill-suppliers.ts
import { PrismaClient } from "@prisma/client";
import { ensureUnknownSupplier } from "../src/lib/suppliers";

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({ select: { id: true, name: true } });
  console.log(`Found ${accounts.length} accounts to process.`);

  for (const account of accounts) {
    const supplierId = await ensureUnknownSupplier(prisma, account.id);
    const result = await prisma.asset.updateMany({
      where: {
        accountId: account.id,
        primarySupplierId: null,
      },
      data: { primarySupplierId: supplierId },
    });

    console.log(
      `Account ${account.name ?? account.id}: ensured fallback supplier ${supplierId}, updated ${result.count} assets.`
    );
  }

  console.log("Supplier backfill complete.");
}

main()
  .catch((error) => {
    console.error("Failed to backfill suppliers", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
