-- CreateTable
CREATE TABLE "AccountAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountAddress_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "registrationNumber" TEXT,
    "isSales" BOOLEAN NOT NULL DEFAULT false,
    "isMaintenance" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "serviceRadiusKm" REAL,
    "latitude" REAL,
    "longitude" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupplierCapability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierCapability_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaintenanceTask" ("assetId", "cancelReason", "cancelledAt", "completed", "createdAt", "dueDate", "id", "isRecurring", "nextDueDate", "notes", "parentId", "parentType", "recurrenceMonths", "templateId", "title", "updatedAt", "warrantyId") SELECT "assetId", "cancelReason", "cancelledAt", "completed", "createdAt", "dueDate", "id", "isRecurring", "nextDueDate", "notes", "parentId", "parentType", "recurrenceMonths", "templateId", "title", "updatedAt", "warrantyId" FROM "MaintenanceTask";
DROP TABLE "MaintenanceTask";
ALTER TABLE "new_MaintenanceTask" RENAME TO "MaintenanceTask";
CREATE INDEX "MaintenanceTask_parentType_parentId_idx" ON "MaintenanceTask"("parentType", "parentId");
CREATE INDEX "MaintenanceTask_warrantyId_idx" ON "MaintenanceTask"("warrantyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AccountAddress_accountId_key" ON "AccountAddress"("accountId");

-- CreateIndex
CREATE INDEX "Supplier_accountId_idx" ON "Supplier"("accountId");

-- CreateIndex
CREATE INDEX "Supplier_accountId_isMaintenance_isActive_idx" ON "Supplier"("accountId", "isMaintenance", "isActive");

-- CreateIndex
CREATE INDEX "SupplierCapability_capability_idx" ON "SupplierCapability"("capability");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCapability_supplierId_capability_key" ON "SupplierCapability"("supplierId", "capability");

