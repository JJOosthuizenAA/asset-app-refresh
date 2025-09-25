-- CreateTable
CREATE TABLE "MaintenanceTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "cadenceDays" INTEGER NOT NULL,
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
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaintenanceTask" ("assetId", "completed", "createdAt", "dueDate", "id", "notes", "title", "updatedAt") SELECT "assetId", "completed", "createdAt", "dueDate", "id", "notes", "title", "updatedAt" FROM "MaintenanceTask";
DROP TABLE "MaintenanceTask";
ALTER TABLE "new_MaintenanceTask" RENAME TO "MaintenanceTask";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_accountId_active_nextScheduledAt_idx" ON "MaintenanceTemplate"("accountId", "active", "nextScheduledAt");
