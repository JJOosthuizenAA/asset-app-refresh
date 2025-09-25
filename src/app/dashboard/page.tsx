// src/app/dashboard/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { getDashboardConfig } from "@/lib/dashboard-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- date helpers ---
function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }

// Defaults if config lookup fails
const DEFAULT_CFG = {
    tasksDueInDays: 7,
    warrantiesExpiringInDays: 30,
    overdueGraceDays: 0,
};

export default async function DashboardPage() {
    const accountId = await requireAccountId();

    // 1) Load config safely
    let cfg = DEFAULT_CFG;
    const errors: string[] = [];
    try {
        cfg = await getDashboardConfig(accountId);
    } catch (e: any) {
        errors.push(`Config error: ${e?.message ?? String(e)}`);
    }

    // 2) Compute date windows
    const todayStart = startOfDay();
    const nextDueEnd = endOfDay(addDays(todayStart, cfg.tasksDueInDays));
    const expiringEnd = endOfDay(addDays(todayStart, cfg.warrantiesExpiringInDays));
    const overdueCutoff = endOfDay(addDays(todayStart, -cfg.overdueGraceDays - 1));
    // 3) Run all counts but never throw the page - collect failures
    const results = await Promise.allSettled([
        prisma.property.count({ where: { accountId } }),
        prisma.vehicle.count({ where: { accountId } }),
        prisma.asset.count({ where: { accountId } }),
        prisma.maintenanceTask.count({
            where: { OR: [{ asset: { accountId } }, { assetId: null }] },
        }),
        prisma.warranty.count({ where: { asset: { accountId } } }),
        prisma.warranty.count({
            where: {
                asset: { accountId },
                expiresAt: { gte: todayStart, lte: expiringEnd },
            },
        }),
        prisma.maintenanceTask.count({
            where: {
                completed: false,
                dueDate: { gte: todayStart, lte: nextDueEnd },
                OR: [{ asset: { accountId } }, { assetId: null }],
            },
        }),
        prisma.maintenanceTask.count({
            where: {
                completed: false,
                dueDate: { lt: overdueCutoff },
                OR: [{ asset: { accountId } }, { assetId: null }],
            },
        }),
    ]);

    // Helper to extract numbers or 0 and collect error messages
    function numAt(i: number, label: string) {
        const r = results[i];
        if (r.status === "fulfilled") return r.value as number;
        errors.push(`${label} error: ${r.reason?.message ?? String(r.reason)}`);
        return 0;
    }

    const propertyCount = numAt(0, "Properties");
    const vehicleCount = numAt(1, "Vehicles");
    const assetCount = numAt(2, "Assets");
    const taskCount = numAt(3, "Tasks");
    const warrantyCount = numAt(4, "Warranties");
    const warrantiesExpiringSoon = numAt(5, "Warranties expiring soon");
    const tasksDueSoon = numAt(6, "Tasks due soon");
    const tasksOverdue = numAt(7, "Tasks overdue");

    return (
        <main className="container py-8">
            <h1>Dashboard</h1>

            {/* Quick actions */}
            <div className="space-x-2" style={{ marginTop: 12 }}>
                <Link href="/assets/new" className="btn btn-primary">New Asset</Link>
                <Link href="/tasks/new" className="btn btn-primary">New Task</Link>
                <Link href="/warranties/new" className="btn btn-primary">New Warranty</Link>
            </div>

            {/* Row 1: core stats */}
            <div className="stats-row">
                <div className="stat"><div className="label">Properties</div><div className="value">{propertyCount}</div></div>
                <div className="stat"><div className="label">Vehicles</div><div className="value">{vehicleCount}</div></div>
                <div className="stat"><div className="label">Assets</div><div className="value">{assetCount}</div></div>
                <div className="stat"><div className="label">Tasks</div><div className="value">{taskCount}</div></div>
            </div>

            {/* Row 2: time-sensitive stats */}
            <div className="stats-row">
                <div className="stat">
                    <div className="label">Warranties</div>
                    <div className="value">{warrantyCount}</div>
                    <div><Link href="/warranties" className="text-xs">View warranties</Link></div>
                </div>
                <div className="stat">
                    <div className="label">Warranties expiring (next {cfg.warrantiesExpiringInDays} days)</div>
                    <div className="value">{warrantiesExpiringSoon}</div>
                    <div><Link href="/warranties?statusFilter=active&sort=expiresAt&dir=asc" className="text-xs">View warranties</Link></div>
                </div>
                <div className="stat">
                    <div className="label">Tasks due (next {cfg.tasksDueInDays} days)</div>
                    <div className="value">{tasksDueSoon}</div>
                    <div><Link href="/tasks?statusFilter=open&sort=dueDate&dir=asc" className="text-xs">View tasks</Link></div>
                </div>
                <div className="stat">
                    <div className="label">Tasks past due{cfg.overdueGraceDays ? ` (>${cfg.overdueGraceDays}d grace)` : ""}</div>
                    <div className="value">{tasksOverdue}</div>
                    <div><Link href="/tasks?statusFilter=open&sort=dueDate&dir=asc" className="text-xs">View tasks</Link></div>
                </div>
            </div>

            {/* Debug panel: only appears if something failed */}
            {errors.length > 0 && (
                <div className="card" style={{ marginTop: "1rem", borderColor: "#fca5a5" }}>
                    <div className="card-header">
                        <div className="card-title">Debug</div>
                    </div>
                    <div className="card-content">
                        <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                            {errors.map((e, i) => (
                                <li key={i} className="text-xs" style={{ color: "#b91c1c" }}>{e}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </main>
    );
}

















