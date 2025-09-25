// scripts/backfill-parents.ts
import { ParentType, PortfolioType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function portfolioTypeToParent(type: PortfolioType): ParentType {
  switch (type) {
    case PortfolioType.Property:
      return ParentType.Property;
    case PortfolioType.Vehicle:
      return ParentType.Vehicle;
    case PortfolioType.Personal:
      return ParentType.PersonContainer;
    case PortfolioType.Other:
    default:
      return ParentType.OtherContainer;
  }
}

async function ensureParent(accountId: string, portfolioId: string, portfolioName: string, type: ParentType) {
  switch (type) {
    case ParentType.Property: {
      const existing = await prisma.property.findFirst({ where: { legacyPortfolioId: portfolioId } });
      if (existing) {
        if (existing.name !== portfolioName || existing.label !== portfolioName) {
          return prisma.property.update({ where: { id: existing.id }, data: { name: portfolioName, label: portfolioName } });
        }
        return existing;
      }
      return prisma.property.create({
        data: {
          accountId,
          name: portfolioName,
          label: portfolioName,
          legacyPortfolioId: portfolioId,
        },
      });
    }
    case ParentType.Vehicle: {
      const existing = await prisma.vehicle.findFirst({ where: { legacyPortfolioId: portfolioId } });
      if (existing) {
        if (existing.nickname !== portfolioName) {
          return prisma.vehicle.update({ where: { id: existing.id }, data: { nickname: portfolioName } });
        }
        return existing;
      }
      return prisma.vehicle.create({
        data: {
          accountId,
          nickname: portfolioName,
          legacyPortfolioId: portfolioId,
        },
      });
    }
    case ParentType.PersonContainer: {
      const existing = await prisma.personContainer.findFirst({ where: { legacyPortfolioId: portfolioId } });
      if (existing) {
        if (existing.label !== portfolioName) {
          return prisma.personContainer.update({ where: { id: existing.id }, data: { label: portfolioName } });
        }
        return existing;
      }
      return prisma.personContainer.create({
        data: {
          accountId,
          label: portfolioName || "Personal",
          legacyPortfolioId: portfolioId,
        },
      });
    }
    case ParentType.OtherContainer:
    default: {
      const existing = await prisma.otherContainer.findFirst({ where: { legacyPortfolioId: portfolioId } });
      if (existing) {
        if (existing.label !== portfolioName) {
          return prisma.otherContainer.update({ where: { id: existing.id }, data: { label: portfolioName } });
        }
        return existing;
      }
      return prisma.otherContainer.create({
        data: {
          accountId,
          label: portfolioName || "Other",
          legacyPortfolioId: portfolioId,
        },
      });
    }
  }
}

async function main() {
  const portfolios = await prisma.portfolio.findMany({
    include: {
      assets: { select: { id: true } },
    },
  });

  console.log(`Found ${portfolios.length} portfolios to process.`);

  for (const portfolio of portfolios) {
    const parentType = portfolioTypeToParent(portfolio.type);
    const portfolioName = (portfolio.name || "").trim() || "Untitled";

    const parent = await ensureParent(portfolio.accountId, portfolio.id, portfolioName, parentType);

    const assetIds = portfolio.assets.map((asset) => asset.id);

    await prisma.$transaction(async (tx) => {
      if (assetIds.length > 0) {
        await tx.asset.updateMany({
          where: { id: { in: assetIds } },
          data: {
            parentType,
            parentId: parent.id,
          },
        });

        await tx.maintenanceTask.updateMany({
          where: { assetId: { in: assetIds } },
          data: {
            parentType,
            parentId: parent.id,
          },
        });

        await tx.maintenanceTemplate.updateMany({
          where: { assetId: { in: assetIds } },
          data: {
            parentType,
            parentId: parent.id,
          },
        });
      }
    });

    console.log(`Portfolio ${portfolio.name} (${portfolio.type}) -> ${parentType} ${parent.id}`);
  }

  console.log("Backfill complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



