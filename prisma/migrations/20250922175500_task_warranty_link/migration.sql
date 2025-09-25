PRAGMA foreign_keys=OFF;

CREATE TABLE "new_MaintenanceTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueDate" DATETIME,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "assetId" TEXT,
    "parentType" TEXT,
    "parentId" TEXT,
    "templateId" TEXT,
    "isRecurring" INTEGER NOT NULL DEFAULT 0,
    "recurrenceMonths" INTEGER,
    "nextDueDate" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "warrantyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenanceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_MaintenanceTask" (
    "id", "title", "notes", "dueDate", "completed", "assetId", "parentType", "parentId", "templateId", "isRecurring", "recurrenceMonths", "nextDueDate", "cancelledAt", "cancelReason", "createdAt", "updatedAt"
)
SELECT
    "id", "title", "notes", "dueDate", "completed", "assetId", "parentType", "parentId", "templateId", "isRecurring", "recurrenceMonths", "nextDueDate", "cancelledAt", "cancelReason", "createdAt", "updatedAt"
FROM "MaintenanceTask";

DROP TABLE "MaintenanceTask";
ALTER TABLE "new_MaintenanceTask" RENAME TO "MaintenanceTask";

CREATE INDEX "MaintenanceTask_parentType_parentId_idx" ON "MaintenanceTask"("parentType", "parentId");
CREATE INDEX "MaintenanceTask_warrantyId_idx" ON "MaintenanceTask"("warrantyId");

PRAGMA foreign_keys=ON;
