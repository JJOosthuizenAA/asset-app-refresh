-- CreateTable
CREATE TABLE "DashboardConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "tasksDueInDays" INTEGER NOT NULL DEFAULT 7,
    "warrantiesExpiringInDays" INTEGER NOT NULL DEFAULT 30,
    "overdueGraceDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DashboardConfig_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardConfig_accountId_key" ON "DashboardConfig"("accountId");
