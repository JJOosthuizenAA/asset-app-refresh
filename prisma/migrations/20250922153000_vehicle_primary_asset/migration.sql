PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Vehicle" (
    "legacyPortfolioId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "nickname" TEXT,
    "vin" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "licenseRenewalOn" DATETIME,
    "insuranceExpiresOn" DATETIME,
    "servicePlanExpiresOn" DATETIME,
    "roadworthyExpiresOn" DATETIME,
    "notes" TEXT,
    "primaryAssetId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_primaryAssetId_fkey" FOREIGN KEY ("primaryAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Vehicle" (
    "legacyPortfolioId",
    "id",
    "accountId",
    "nickname",
    "vin",
    "make",
    "model",
    "year",
    "licenseRenewalOn",
    "insuranceExpiresOn",
    "servicePlanExpiresOn",
    "roadworthyExpiresOn",
    "notes",
    "createdAt",
    "updatedAt"
)
SELECT
    "legacyPortfolioId",
    "id",
    "accountId",
    "nickname",
    "vin",
    "make",
    "model",
    "year",
    "licenseRenewalOn",
    "insuranceExpiresOn",
    "servicePlanExpiresOn",
    "roadworthyExpiresOn",
    "notes",
    "createdAt",
    "updatedAt"
FROM "Vehicle";

DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";

CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");
CREATE UNIQUE INDEX "Vehicle_primaryAssetId_key" ON "Vehicle"("primaryAssetId") WHERE "primaryAssetId" IS NOT NULL;

PRAGMA foreign_keys=ON;
