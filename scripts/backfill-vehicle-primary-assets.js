const { PrismaClient, AssetType, AssetStatus, ParentType } = require("@prisma/client");

function deriveVehicleAssetName(vehicle) {
  const nickname = vehicle.nickname?.trim();
  if (nickname) return nickname;
  const descriptor = [vehicle.year ? String(vehicle.year) : null, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return descriptor || "Vehicle";
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const vehicles = await prisma.vehicle.findMany({
      select: {
        id: true,
        accountId: true,
        nickname: true,
        make: true,
        model: true,
        year: true,
        vin: true,
        primaryAssetId: true,
      },
    });

    for (const vehicle of vehicles) {
      let primaryAssetId = vehicle.primaryAssetId;
      const assetName = deriveVehicleAssetName(vehicle);

      if (!primaryAssetId) {
        const asset = await prisma.asset.create({
          data: {
            accountId: vehicle.accountId,
            name: assetName,
            assetType: AssetType.Car,
            serial: vehicle.vin ?? undefined,
            parentType: ParentType.Vehicle,
            parentId: vehicle.id,
            status: AssetStatus.Active,
          },
          select: { id: true },
        });

        primaryAssetId = asset.id;
        await prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { primaryAssetId },
        });
        console.log(`Linked primary asset ${primaryAssetId} to vehicle ${vehicle.id}`);
      } else {
        await prisma.asset.update({
          where: { id: primaryAssetId },
          data: {
            name: assetName,
            serial: vehicle.vin ?? undefined,
          },
        });
      }

      await prisma.maintenanceTask.updateMany({
        where: {
          parentType: ParentType.Vehicle,
          parentId: vehicle.id,
          assetId: null,
        },
        data: {
          assetId: primaryAssetId,
          parentType: null,
          parentId: null,
        },
      });

      await prisma.document.updateMany({
        where: {
          parentType: ParentType.Vehicle,
          parentId: vehicle.id,
          assetId: null,
        },
        data: {
          assetId: primaryAssetId,
          parentType: null,
          parentId: null,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});





