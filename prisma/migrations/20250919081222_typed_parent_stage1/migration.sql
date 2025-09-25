-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Asset" ADD COLUMN "parentType" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceTask" ADD COLUMN "parentId" TEXT;
ALTER TABLE "MaintenanceTask" ADD COLUMN "parentType" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceTemplate" ADD COLUMN "parentId" TEXT;
ALTER TABLE "MaintenanceTemplate" ADD COLUMN "parentType" TEXT;

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "purchasePriceCents" INTEGER,
    "purchaseDate" DATETIME,
    "ownershipStatus" TEXT NOT NULL DEFAULT 'Owner',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PersonContainer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PersonContainer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OtherContainer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OtherContainer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "contentType" TEXT,
    "parentType" TEXT,
    "parentId" TEXT,
    "assetId" TEXT,
    "taskId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "parentType" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "assetId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Document_parentType_parentId_idx" ON "Document"("parentType", "parentId");

-- CreateIndex
CREATE INDEX "Document_assetId_idx" ON "Document"("assetId");

-- CreateIndex
CREATE INDEX "Document_taskId_idx" ON "Document"("taskId");

-- CreateIndex
CREATE INDEX "CollectionItem_parentType_parentId_idx" ON "CollectionItem"("parentType", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_collectionId_parentType_parentId_assetId_key" ON "CollectionItem"("collectionId", "parentType", "parentId", "assetId");

-- CreateIndex
CREATE INDEX "Asset_parentType_parentId_idx" ON "Asset"("parentType", "parentId");

-- CreateIndex
CREATE INDEX "MaintenanceTask_parentType_parentId_idx" ON "MaintenanceTask"("parentType", "parentId");
