-- RedefineTables
PRAGMA defer_foreign_keys=ON;
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
    "primarySupplierId" TEXT,
    CONSTRAINT "Asset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_primarySupplierId_fkey" FOREIGN KEY ("primarySupplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("accountId", "assetType", "category", "createdAt", "description", "id", "legacyPortfolioId", "location", "name", "parentId", "parentType", "purchaseDate", "purchasePriceCents", "serial", "status", "statusChangedAt", "updatedAt") SELECT "accountId", "assetType", "category", "createdAt", "description", "id", "legacyPortfolioId", "location", "name", "parentId", "parentType", "purchaseDate", "purchasePriceCents", "serial", "status", "statusChangedAt", "updatedAt" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE UNIQUE INDEX "Asset_serial_key" ON "Asset"("serial");
CREATE INDEX "Asset_accountId_idx" ON "Asset"("accountId");
CREATE INDEX "Asset_parentType_parentId_idx" ON "Asset"("parentType", "parentId");
CREATE INDEX "Asset_primarySupplierId_idx" ON "Asset"("primarySupplierId");
CREATE TABLE "new_MaintenanceTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueDate" DATETIME,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "assetId" TEXT,
    "parentType" TEXT,
    "parentId" TEXT,
    "templateId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceMonths" INTEGER,
    "nextDueDate" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "warrantyId" TEXT,
    "preferredSupplierId" TEXT,
    "selfServiceSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaintenanceTask" ("assetId", "cancelReason", "cancelledAt", "completed", "createdAt", "dueDate", "id", "isRecurring", "nextDueDate", "notes", "parentId", "parentType", "recurrenceMonths", "templateId", "title", "updatedAt", "warrantyId") SELECT "assetId", "cancelReason", "cancelledAt", "completed", "createdAt", "dueDate", "id", "isRecurring", "nextDueDate", "notes", "parentId", "parentType", "recurrenceMonths", "templateId", "title", "updatedAt", "warrantyId" FROM "MaintenanceTask";
DROP TABLE "MaintenanceTask";
ALTER TABLE "new_MaintenanceTask" RENAME TO "MaintenanceTask";
CREATE INDEX "MaintenanceTask_parentType_parentId_idx" ON "MaintenanceTask"("parentType", "parentId");
CREATE INDEX "MaintenanceTask_warrantyId_idx" ON "MaintenanceTask"("warrantyId");
CREATE INDEX "MaintenanceTask_preferredSupplierId_idx" ON "MaintenanceTask"("preferredSupplierId");
CREATE TABLE "new_OtherContainer" (
    "legacyPortfolioId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "primaryPropertyId" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OtherContainer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OtherContainer_primaryPropertyId_fkey" FOREIGN KEY ("primaryPropertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OtherContainer" ("accountId", "createdAt", "id", "label", "legacyPortfolioId", "notes", "updatedAt") SELECT "accountId", "createdAt", "id", "label", "legacyPortfolioId", "notes", "updatedAt" FROM "OtherContainer";
DROP TABLE "OtherContainer";
ALTER TABLE "new_OtherContainer" RENAME TO "OtherContainer";
CREATE TABLE "new_PersonContainer" (
    "legacyPortfolioId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "primaryPropertyId" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonContainer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PersonContainer_primaryPropertyId_fkey" FOREIGN KEY ("primaryPropertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PersonContainer" ("accountId", "createdAt", "id", "label", "legacyPortfolioId", "notes", "updatedAt") SELECT "accountId", "createdAt", "id", "label", "legacyPortfolioId", "notes", "updatedAt" FROM "PersonContainer";
DROP TABLE "PersonContainer";
ALTER TABLE "new_PersonContainer" RENAME TO "PersonContainer";
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
    "primaryPropertyId" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_primaryAssetId_fkey" FOREIGN KEY ("primaryAssetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_primaryPropertyId_fkey" FOREIGN KEY ("primaryPropertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" ("accountId", "createdAt", "id", "insuranceExpiresOn", "legacyPortfolioId", "licenseRenewalOn", "make", "model", "nickname", "notes", "primaryAssetId", "roadworthyExpiresOn", "servicePlanExpiresOn", "updatedAt", "vin", "year") SELECT "accountId", "createdAt", "id", "insuranceExpiresOn", "legacyPortfolioId", "licenseRenewalOn", "make", "model", "nickname", "notes", "primaryAssetId", "roadworthyExpiresOn", "servicePlanExpiresOn", "updatedAt", "vin", "year" FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");
CREATE UNIQUE INDEX "Vehicle_primaryAssetId_key" ON "Vehicle"("primaryAssetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

