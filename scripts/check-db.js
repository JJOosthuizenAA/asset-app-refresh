require("dotenv").config(); // loads .env
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    const [properties, vehicles, assets, users, accounts] = await Promise.all([
      prisma.property.count(),
      prisma.vehicle.count(),
      prisma.asset.count(),
      prisma.user.count(),
      prisma.account.count(),
    ]);

    console.log(JSON.stringify({
      databaseUrl: process.env.DATABASE_URL,
      counts: { properties, vehicles, assets, users, accounts }
    }, null, 2));
  } catch (e) {
    console.error("CHECK-DB ERROR:", e);
  } finally {
    await prisma.();
  }
})();
