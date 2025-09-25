PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "assetType" TEXT,
    "serial" TEXT,
    "location" TEXT,
    "purchaseDate" DATETIME,
    "purchasePriceCents" INTEGER,
    "accountId" TEXT NOT NULL,
    "parentType" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "statusChangedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "legacyPortfolioId" TEXT,
    CONSTRAINT "Asset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Asset" (
    "id",
    "name",
    "description",
    "category",
    "assetType",
    "serial",
    "location",
    "purchaseDate",
    "purchasePriceCents",
    "accountId",
    "parentType",
    "parentId",
    "status",
    "statusChangedAt",
    "createdAt",
    "updatedAt",
    "legacyPortfolioId"
)
SELECT
    "id",
    "name",
    "description",
    "category",
    "assetType",
    "serial",
    "location",
    "purchaseDate",
    "purchasePriceCents",
    (
        SELECT "accountId"
        FROM "Portfolio"
        WHERE "Portfolio"."id" = "Asset"."portfolioId"
    ) AS "accountId",
    "parentType",
    "parentId",
    "status",
    "statusChangedAt",
    "createdAt",
    "updatedAt",
    "portfolioId" AS "legacyPortfolioId"
FROM "Asset";

DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";

CREATE UNIQUE INDEX "Asset_serial_key" ON "Asset"("serial");
CREATE INDEX "Asset_parentType_parentId_idx" ON "Asset"("parentType", "parentId");
CREATE INDEX "Asset_accountId_idx" ON "Asset"("accountId");

PRAGMA foreign_keys=ON;

