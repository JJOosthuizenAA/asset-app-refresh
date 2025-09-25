-- AlterTable
ALTER TABLE "OtherContainer" ADD COLUMN "legacyPortfolioId" TEXT;

-- AlterTable
ALTER TABLE "PersonContainer" ADD COLUMN "legacyPortfolioId" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "legacyPortfolioId" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "legacyPortfolioId" TEXT;
