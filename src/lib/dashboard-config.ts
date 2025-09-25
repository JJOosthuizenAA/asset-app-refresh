// src/lib/dashboard-config.ts
import { prisma } from "@/lib/db";
import { getPref } from "./preferences";

export type DashboardConfig = {
    tasksDueInDays: number;
    warrantiesExpiringInDays: number;
    overdueGraceDays: number;
};

const DEFAULTS: DashboardConfig = {
    tasksDueInDays: 7,
    warrantiesExpiringInDays: 30,
    overdueGraceDays: 0,
};

export async function getDashboardConfig(accountId: string): Promise<DashboardConfig> {
    const tasksDueInDays = await getPref<number>(accountId, "dashboard", "tasksDueInDays", DEFAULTS.tasksDueInDays);
    const warrantiesExpiringInDays = await getPref<number>(
        accountId, "dashboard", "warrantiesExpiringInDays", DEFAULTS.warrantiesExpiringInDays
    );
    const overdueGraceDays = await getPref<number>(accountId, "dashboard", "overdueGraceDays", DEFAULTS.overdueGraceDays);

    // Optional fallback to an old dashboardConfig table if you had one
    if (
        tasksDueInDays === undefined ||
        warrantiesExpiringInDays === undefined ||
        overdueGraceDays === undefined
    ) {
        try {
            const cfg = await prisma.dashboardConfig.findUnique({
                where: { accountId },
                select: { tasksDueInDays: true, warrantiesExpiringInDays: true, overdueGraceDays: true },
            });
            if (cfg) {
                return {
                    tasksDueInDays: cfg.tasksDueInDays ?? DEFAULTS.tasksDueInDays,
                    warrantiesExpiringInDays: cfg.warrantiesExpiringInDays ?? DEFAULTS.warrantiesExpiringInDays,
                    overdueGraceDays: cfg.overdueGraceDays ?? DEFAULTS.overdueGraceDays,
                };
            }
        } catch {
            // ignore if table doesn't exist
        }
    }

    return {
        tasksDueInDays: Number(tasksDueInDays ?? DEFAULTS.tasksDueInDays),
        warrantiesExpiringInDays: Number(warrantiesExpiringInDays ?? DEFAULTS.warrantiesExpiringInDays),
        overdueGraceDays: Number(overdueGraceDays ?? DEFAULTS.overdueGraceDays),
    };
}
