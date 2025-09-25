PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "documentDate" DATETIME,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "contentType" TEXT,
    "originalName" TEXT,
    "parentType" TEXT,
    "parentId" TEXT,
    "assetId" TEXT,
    "taskId" TEXT,
    "warrantyId" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Document" (
    "id",
    "accountId",
    "title",
    "description",
    "filePath",
    "contentType",
    "parentType",
    "parentId",
    "assetId",
    "taskId",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "accountId",
    "title",
    "description",
    "filePath",
    "contentType",
    "parentType",
    "parentId",
    "assetId",
    "taskId",
    "createdAt",
    "updatedAt"
FROM "Document";

DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";

CREATE INDEX "Document_parentType_parentId_idx" ON "Document"("parentType", "parentId");
CREATE INDEX "Document_assetId_idx" ON "Document"("assetId");
CREATE INDEX "Document_taskId_idx" ON "Document"("taskId");
CREATE INDEX "Document_warrantyId_idx" ON "Document"("warrantyId");
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");

PRAGMA foreign_keys=ON;
