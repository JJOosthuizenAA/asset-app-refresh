-- AlterTable
ALTER TABLE "Account" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "Account" ADD COLUMN "currencyCode" TEXT;

-- AlterTable
ALTER TABLE "Portfolio" ADD COLUMN "currencyCode" TEXT;
