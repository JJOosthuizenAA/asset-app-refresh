import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const acc = await prisma.account.upsert({
    where: { code: "ACC-1001" },
    update: {},
    create: { code: "ACC-1001", name: "Primary Account" },
  });

  const p1 = await prisma.portfolio.create({
    data: { name: "ABC", type: "Other", accountId: acc.id },
  });
  const p2 = await prisma.portfolio.create({
    data: { name: "Johan DT15FF GP", type: "Vehicle", accountId: acc.id },
  });
  await prisma.asset.create({ data: { name: "2018 Toyota", portfolioId: p2.id } });

  console.log("Seed complete");
}

main().finally(async () => {
  await prisma.$disconnect();
});
