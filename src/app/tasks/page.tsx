// src/app/tasks/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { revalidatePath } from "next/cache";
import { runMaintenanceScheduler } from "@/lib/task-scheduler";
import { addMonths, startOfDay } from "date-fns";
import { handleRecurringTransition, type RecurringTaskSnapshot, adjustToNextBusinessDay } from "@/lib/recurring-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------------------- Server actions --------------------- */
function describeCadence(months: number | null): string {
    if (!months || months < 1) return "--";
    return months === 1 ? "Every month" : "Every " + months + " months";
}

async function toggleComplete(taskId: string, completed: boolean, currentSearch: string) {
    "use server";
    const accountId = await requireAccountId();
    const targetPath = currentSearch ? "/tasks?" + currentSearch : "/tasks";

    const existing = await prisma.maintenanceTask.findUnique({
        where: { id: taskId },
        select: {
            id: true,
            title: true,
            notes: true,
            dueDate: true,
            completed: true,
            isRecurring: true,
            recurrenceMonths: true,
            nextDueDate: true,
            assetId: true,
            templateId: true,
            cancelledAt: true,
            asset: { select: { accountId: true } },
        },
    });
    if (!existing || (existing.asset && existing.asset.accountId !== accountId)) {
        throw new Error("Task not found");
    }

    if (existing.cancelledAt) {
        revalidatePath(targetPath);
        return;
    }

    const nextDueDate = existing.isRecurring && existing.recurrenceMonths && existing.dueDate
        ? adjustToNextBusinessDay(existing.nextDueDate ?? addMonths(existing.dueDate, existing.recurrenceMonths))
        : null;

    const before: RecurringTaskSnapshot = {
        id: existing.id,
        title: existing.title,
        notes: existing.notes,
        dueDate: existing.dueDate,
        nextDueDate: existing.nextDueDate,
        completed: existing.completed,
        isRecurring: existing.isRecurring,
        recurrenceMonths: existing.recurrenceMonths,
        assetId: existing.assetId,
        templateId: existing.templateId,
        cancelledAt: existing.cancelledAt,
    };

    const after: RecurringTaskSnapshot = {
        id: existing.id,
        title: existing.title,
        notes: existing.notes,
        dueDate: existing.dueDate,
        nextDueDate,
        completed,
        isRecurring: existing.isRecurring,
        recurrenceMonths: existing.recurrenceMonths,
        assetId: existing.assetId,
        templateId: existing.templateId,
        cancelledAt: existing.cancelledAt,
    };

    await prisma.$transaction(async (tx) => {
        await tx.maintenanceTask.update({
            where: { id: taskId },
            data: {
                completed,
                nextDueDate,
            },
        });

        await handleRecurringTransition({ before, after, tx });
    });

    revalidatePath(targetPath);
}

async function deleteTask(taskId: string) {
    "use server";
    const accountId = await requireAccountId();

    const owned = await prisma.maintenanceTask.findFirst({
        where: {
            id: taskId,
            OR: [
                { asset: { accountId } },
                { template: { accountId } },
                { assetId: null, templateId: null },
            ],
        },
        select: { id: true },
    });
    if (!owned) throw new Error("Task not found");

    await prisma.maintenanceTask.delete({ where: { id: taskId } });
    revalidatePath("/tasks");
}

async function runSchedulerAction() {
    "use server";
    const accountId = await requireAccountId();
    await runMaintenanceScheduler({ accountId });
    revalidatePath("/tasks");
    revalidatePath("/tasks/templates");
}

/* --------------------- Page --------------------- */
type SearchParams = Record<string, string | string[] | undefined>;

function getParam(sp: SearchParams, key: string): string | undefined {
    const v = sp[key];
    if (v == null) return undefined;
    return Array.isArray(v) ? (v[0] ?? "").toString() : v.toString();
}

export default async function TasksIndex({ searchParams }: { searchParams: SearchParams }) {
    const accountId = await requireAccountId();

    // Parse params defensively
    const q = (getParam(searchParams, "q") || "").trim();
    // ⬇️ renamed from "status" → "statusFilter" to avoid collisions
    const statusRaw = (getParam(searchParams, "statusFilter") || "all").trim().toLowerCase();
    const status: "all" | "open" | "completed" | "cancelled" =
        statusRaw === "open" || statusRaw === "completed" || statusRaw === "cancelled"
            ? (statusRaw as any)
            : "all";

    const assetFilter = (getParam(searchParams, "asset") || "").trim() || undefined;
    const sort = (getParam(searchParams, "sort") as "dueDate" | "createdAt" | "title") || "createdAt";
    const dir = (getParam(searchParams, "dir") as "asc" | "desc") || "desc";
    const page = Math.max(1, parseInt(getParam(searchParams, "page") || "1", 10) || 1);
    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    // WHERE
    const and: any[] = [];

    if (q) {
        and.push({
            OR: [
                { title: { contains: q } },
                { notes: { contains: q } },
                { asset: { name: { contains: q } } },
            ],
        });
    }

    if (status === "cancelled") {
        and.push({ cancelledAt: { not: null } });
    } else {
        and.push({ cancelledAt: null });
        if (status === "open") and.push({ completed: false });
        if (status === "completed") and.push({ completed: true });
    }
    if (assetFilter) and.push({ assetId: assetFilter });

    const where: Parameters<typeof prisma.maintenanceTask.findMany>[0]["where"] = {
        OR: [
            { asset: { accountId } },
            { template: { accountId } },
            { assetId: null, templateId: null },
        ],
        ...(and.length ? { AND: and } : {}),
    };

    // ORDER BY
    const orderBy: any[] = [];
    if (sort === "dueDate") orderBy.push({ dueDate: dir });
    if (sort === "createdAt") orderBy.push({ createdAt: dir });
    if (sort === "title") orderBy.push({ title: dir });
    if (!orderBy.length) orderBy.push({ createdAt: "desc" as const });

    const [total, tasks, assets] = await Promise.all([
        prisma.maintenanceTask.count({ where }),
        prisma.maintenanceTask.findMany({
            where,
            orderBy,
            skip,
            take: pageSize,
            select: {
                id: true,
                title: true,
                notes: true,
                dueDate: true,
                nextDueDate: true,
                completed: true,
                isRecurring: true,
                recurrenceMonths: true,
                cancelledAt: true,
                cancelReason: true,
                createdAt: true,
                asset: { select: { id: true, name: true } },
                template: { select: { id: true, title: true } },
            },
        }),
        prisma.asset.findMany({
            where: { accountId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Build currentSearch from normalized values (so actions keep filters)
    const currentSearch = new URLSearchParams({
        ...(q ? { q } : {}),
        ...(status !== "all" ? { statusFilter: status } : {}),
        ...(assetFilter ? { asset: assetFilter } : {}),
        sort,
        dir,
        page: String(page),
    }).toString();

    return (
        <main className="container py-8">
            {/* Header */}
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>Tasks</h1>
                <div className="space-x-2">
                    <form action={runSchedulerAction} style={{ display: "inline" }}>
                        <button type="submit" className="btn btn-outline">Run scheduler</button>
                    </form>
                    <Link href="/tasks/templates" className="btn btn-outline">Templates</Link>
                    <Link href="/tasks/new" className="btn btn-primary">New Task</Link>
                </div>
            </div>

            {/* Filters */}
            <form method="GET" action="/tasks" className="card" style={{ marginBottom: "1rem" }}>
                <div className="card-header">
                    <div className="card-title">Filter</div>
                </div>
                <div className="card-content">
                    <div className="grid grid-3">
                        {/* Search spans two columns on wide screens */}
                        <div className="field span-2">
                            <label htmlFor="q" className="label">Search</label>
                            <input
                                id="q"
                                name="q"
                                type="text"
                                defaultValue={q}
                                placeholder="Title, notes, asset name…"
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="statusFilter" className="label">Status</label>
                            <select id="statusFilter" name="statusFilter" defaultValue={status}>
                                <option value="all">All</option>
                                <option value="open">Open</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="asset" className="label">Asset</label>
                            <select id="asset" name="asset" defaultValue={assetFilter || ""}>
                                <option value="">All</option>
                                {assets.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="sort" className="label">Sort by</label>
                            <select id="sort" name="sort" defaultValue={sort}>
                                <option value="dueDate">Due date</option>
                                <option value="createdAt">Created</option>
                                <option value="title">Title</option>
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="dir" className="label">Direction</label>
                            <select id="dir" name="dir" defaultValue={dir}>
                                <option value="asc">Asc</option>
                                <option value="desc">Desc</option>
                            </select>
                        </div>

                        <div className="field" style={{ alignSelf: "end" }}>
                            <div className="space-x-2">
                                <button type="submit" className="btn btn-primary">Apply</button>
                                <Link href="/tasks" className="btn btn-outline">Reset</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div className="text-muted-foreground" style={{ marginBottom: ".5rem" }}>
                Showing <strong className="text-foreground">{tasks.length}</strong> of{" "}
                <strong className="text-foreground">{total}</strong> task(s)
            </div>

            {/* Table */}
            <div className="card">
                <div className="card-content" style={{ padding: 0 }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: "28%" }}>Task</th>
                                <th style={{ width: "16%" }}>Asset</th>
                                <th style={{ width: "16%" }}>Template</th>
                                <th style={{ width: "12%" }}>Due</th>
                                <th style={{ width: "12%" }}>Next due</th>
                                <th style={{ width: "12%" }}>Status</th>
                                <th style={{ width: "14%" }}>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {tasks.map((t) => (
                                <tr key={t.id}>
                                    <td>
                                        <div className="font-medium">
                                            <Link href={`/tasks/${t.id}`}>{t.title}</Link>
                                        </div>
                                        {t.notes ? (
                                            <div className="text-muted-foreground" style={{ marginTop: 4, fontSize: ".9rem" }}>
                                                {t.notes.length > 120 ? `${t.notes.slice(0, 120)}...` : t.notes}
                                            </div>
                                        ) : null}
                                    </td>

                                    <td>
                                        {t.asset ? (
                                            <Link href={`/assets/${t.asset.id}`}>{t.asset.name}</Link>
                                        ) : (
                                            <span className="text-muted-foreground">--</span>
                                        )}
                                    </td>

                                    <td>
                                        {t.template ? (
                                            <Link href={`/tasks/templates/${t.template.id}/edit`}>{t.template.title}</Link>
                                        ) : (
                                            <span className="text-muted-foreground">One-off</span>
                                        )}
                                    </td>

                                    <td>{t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "--"}</td>

                                    <td>
                                        {t.isRecurring ? (
                                            t.nextDueDate ? t.nextDueDate.toISOString().slice(0, 10) : "--"
                                        ) : (
                                            <span className="text-muted-foreground">--</span>
                                        )}
                                    </td>

                                    <td>
                                        {t.cancelledAt ? (
                                            <span className="badge badge-outline">Cancelled</span>
                                        ) : t.completed ? (
                                            <span className="badge badge-completed">Completed</span>
                                        ) : (
                                            <span className="badge badge-open">Open</span>
                                        )}
                                        {t.cancelledAt ? (
                                            <div className="text-xs text-muted-foreground" style={{ marginTop: 4 }}>
                                                Cancelled {t.cancelledAt.toISOString().slice(0, 10)}
                                                {t.cancelReason ? " - " + t.cancelReason : ""}
                                            </div>
                                        ) : t.isRecurring ? (
                                            <div className="text-xs text-muted-foreground" style={{ marginTop: 4 }}>
                                                {describeCadence(t.recurrenceMonths)}
                                            </div>
                                        ) : null}
                                    </td>

                                    <td>
                                        <div className="actions-flex">
                                            <form
                                                className="action-slot"
                                                action={async () => {
                                                    "use server";
                                                    await toggleComplete(t.id, !t.completed, currentSearch);
                                                }}
                                            >
                                                <button type="submit" className="btn btn-outline">
                                                    {t.completed ? "Reopen" : "Mark Complete"}
                                                </button>
                                            </form>

                                            <form
                                                className="action-slot"
                                                action={async () => {
                                                    "use server";
                                                    await deleteTask(t.id);
                                                }}
                                            >
                                                <button type="submit" className="btn btn-danger">Delete</button>
                                            </form>

                                            <span className="action-slot">
                                                <Link href={`/tasks/${t.id}`} className="btn btn-outline">View</Link>
                                            </span>

                                            <span className="action-slot">
                                                <Link href={`/tasks/${t.id}/edit`} className="btn btn-outline">Edit</Link>
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {tasks.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ padding: "2rem", textAlign: "center" }} className="text-muted-foreground">
                                        No tasks found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="mt-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="text-muted-foreground">
                    Page <strong className="text-foreground">{page}</strong> of{" "}
                    <strong className="text-foreground">{totalPages}</strong>
                </div>
                <div className="space-x-2">
                    {page > 1 ? (
                        <Link
                            href={`/tasks?${new URLSearchParams({
                                ...(q ? { q } : {}),
                                ...(status !== "all" ? { statusFilter: status } : {}),
                                ...(assetFilter ? { asset: assetFilter } : {}),
                                sort,
                                dir,
                                page: String(page - 1),
                            })}`}
                            className="btn btn-outline"
                        >
                            ← Prev
                        </Link>
                    ) : (
                        <span className="btn btn-outline" style={{ opacity: 0.6, pointerEvents: "none" }}>← Prev</span>
                    )}

                    {page < totalPages ? (
                        <Link
                            href={`/tasks?${new URLSearchParams({
                                ...(q ? { q } : {}),
                                ...(status !== "all" ? { statusFilter: status } : {}),
                                ...(assetFilter ? { asset: assetFilter } : {}),
                                sort,
                                dir,
                                page: String(page + 1),
                            })}`}
                            className="btn btn-outline"
                        >
                            Next →
                        </Link>
                    ) : (
                        <span className="btn btn-outline" style={{ opacity: 0.6, pointerEvents: "none" }}>Next →</span>
                    )}
                </div>
            </div>
        </main>
    );
}
