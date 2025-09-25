// src/app/Logs/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
    at: Date;
    kind: "asset" | "task" | "warranty";
    action: "Created" | "Updated";
    id: string;
    name: string;
    href: string;
};

// helper to compute action as literal union
function actionFromDates(createdAt: Date, updatedAt: Date): Row["action"] {
    return updatedAt && updatedAt.getTime() !== createdAt.getTime()
        ? "Updated"
        : "Created";
}

export default async function LogsPage() {
    // Pull recent items; tweak take if you want more
    const [assets, tasks, warranties] = await Promise.all([
        prisma.asset.findMany({
            select: { id: true, name: true, createdAt: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 50,
        }),
        prisma.maintenanceTask.findMany({
            select: { id: true, title: true, createdAt: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 50,
        }),
        prisma.warranty.findMany({
            select: { id: true, name: true, createdAt: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 50,
        }),
    ]);

    // Map to unified rows with literal action values
    let rows: Row[] = [
        ...assets.map((a) => ({
            at: a.updatedAt,
            kind: "asset" as const,
            action: actionFromDates(a.createdAt, a.updatedAt),
            id: a.id,
            name: a.name ?? "Untitled asset",
            href: `/assets/${a.id}`,
        })),
        ...tasks.map((t) => ({
            at: t.updatedAt,
            kind: "task" as const,
            action: actionFromDates(t.createdAt, t.updatedAt),
            id: t.id,
            name: t.title ?? "Task",
            href: `/tasks/${t.id}`,
        })),
        ...warranties.map((w) => ({
            at: w.updatedAt,
            kind: "warranty" as const,
            action: actionFromDates(w.createdAt, w.updatedAt),
            id: w.id,
            name: w.name ?? "Warranty",
            href: `/warranties/${w.id}`,
        })),
    ];

    // Newest first
    rows.sort((a, b) => b.at.getTime() - a.at.getTime());

    return (
        <main className="p-6 max-w-4xl space-y-6">
            <h1 className="text-xl font-semibold">Activity</h1>

            <ul className="divide-y rounded border">
                {rows.map((r) => (
                    <li key={`${r.kind}-${r.id}-${r.at.toISOString()}`} className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm text-neutral-600">
                                {r.action} {r.kind}
                            </div>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-neutral-500">{r.at.toLocaleString()}</div>
                        </div>
                        <Link href={r.href} className="text-sm underline underline-offset-2">
                            View
                        </Link>
                    </li>
                ))}
            </ul>
        </main>
    );
}
