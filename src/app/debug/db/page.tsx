// src/app/debug/db/page.tsx
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DebugDb() {
    const [accounts, properties, vehicles, assets, tasks] = await Promise.all([
        prisma.account.count(),
        prisma.property.count(),
        prisma.vehicle.count(),
        prisma.asset.count(),
        prisma.maintenanceTask.count(),
    ]);

    const stats = {
        accounts,
        properties,
        vehicles,
        assets,
        maintenanceTasks: tasks,
    };

    return (
        <pre style={{ padding: 16 }}>
            {JSON.stringify(stats, null, 2)}
        </pre>
    );
}
