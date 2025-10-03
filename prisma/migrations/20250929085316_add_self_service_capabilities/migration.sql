-- CreateTable
CREATE TABLE "SelfServiceCapability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SelfServiceCapability_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SelfServiceCapability_accountId_userEmail_idx" ON "SelfServiceCapability"("accountId", "userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SelfServiceCapability_accountId_userEmail_capability_key" ON "SelfServiceCapability"("accountId", "userEmail", "capability");
