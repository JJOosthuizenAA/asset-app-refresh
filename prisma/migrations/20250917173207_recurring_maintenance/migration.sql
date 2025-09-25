/*
  Warnings:

  - You are about to drop the column `cadenceDays` on the `MaintenanceTemplate` table. All the data in the column will be lost.
  - Added the required column `cadenceMonths` to the `MaintenanceTemplate` table without a default value. This is not possible if the table is not empty.

*/
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
    "portfolioId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "statusChangedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("assetType", "category", "createdAt", "description", "id", "location", "name", "portfolioId", "purchaseDate", "purchasePriceCents", "serial", "updatedAt") SELECT "assetType", "category", "createdAt", "description", "id", "location", "name", "portfolioId", "purchaseDate", "purchasePriceCents", "serial", "updatedAt" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE UNIQUE INDEX "Asset_serial_key" ON "Asset"("serial");
CREATE TABLE "new_MaintenanceTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueDate" DATETIME,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "assetId" TEXT,
    "templateId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceMonths" INTEGER,
    "nextDueDate" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaintenanceTask" ("assetId", "completed", "createdAt", "dueDate", "id", "notes", "templateId", "title", "updatedAt") SELECT "assetId", "completed", "createdAt", "dueDate", "id", "notes", "templateId", "title", "updatedAt" FROM "MaintenanceTask";
DROP TABLE "MaintenanceTask";
ALTER TABLE "new_MaintenanceTask" RENAME TO "MaintenanceTask";
CREATE TABLE "new_MaintenanceTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "cadenceMonths" INTEGER NOT NULL,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "startDate" DATETIME,
    "assetId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedAt" DATETIME,
    "nextScheduledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceTemplate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTemplate_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaintenanceTemplate" ("accountId", "active", "assetId", "createdAt", "id", "lastGeneratedAt", "leadTimeDays", "nextScheduledAt", "notes", "startDate", "title", "updatedAt") SELECT "accountId", "active", "assetId", "createdAt", "id", "lastGeneratedAt", "leadTimeDays", "nextScheduledAt", "notes", "startDate", "title", "updatedAt" FROM "MaintenanceTemplate";
DROP TABLE "MaintenanceTemplate";
ALTER TABLE "new_MaintenanceTemplate" RENAME TO "MaintenanceTemplate";
CREATE INDEX "MaintenanceTemplate_accountId_active_nextScheduledAt_idx" ON "MaintenanceTemplate"("accountId", "active", "nextScheduledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
