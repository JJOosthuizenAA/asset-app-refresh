// src/app/tasks/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import AttachmentsPanel from "@/app/_components/AttachmentsPanel";
import DeleteTaskButton from "./edit/DeleteTaskButton";
import { deleteTask } from "./edit/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function describeCadence(months: number | null): string {
    if (!months || months < 1) return "--";
    return months === 1 ? "Every month" : `Every ${months} months`;
}

export default async function ViewTaskPage({ params }: { params: { id: string } }) {
    const accountId = await requireAccountId();
    const id = params.id;

    const task = await prisma.maintenanceTask.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            notes: true,
            dueDate: true,
            completed: true,
            isRecurring: true,
            recurrenceMonths: true,
            nextDueDate: true,
            cancelledAt: true,
            cancelReason: true,
            createdAt: true,
            updatedAt: true,
            asset: { select: { id: true, name: true, accountId: true } },
            template: {
                select: {
                    id: true,
                    title: true,
                    cadenceMonths: true,
                    leadTimeDays: true,
                    nextScheduledAt: true,
                    active: true,
                },
            },
        },
    });

    if (!task) notFound();
    if (task.asset && task.asset.accountId !== accountId) notFound();

    const due = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "--";
    const created = task.createdAt.toISOString().slice(0, 10);
    const updated = task.updatedAt.toISOString().slice(0, 10);

    const templateInfo = task.template
        ? {
            status: task.template.active ? "Active" : "Paused",
            cadence: describeCadence(task.template.cadenceMonths),
            lead: task.template.leadTimeDays,
            next: task.template.nextScheduledAt ? task.template.nextScheduledAt.toISOString().slice(0, 10) : null,
        }
        : null;

    const templateMeta = templateInfo
        ? [
            templateInfo.status,
            templateInfo.cadence,
            templateInfo.lead ? `lead ${templateInfo.lead} day${templateInfo.lead === 1 ? "" : "s"}` : null,
            templateInfo.next ? `next ${templateInfo.next}` : null,
        ].filter(Boolean).join(" | ")
        : null;

    const statusBadge = task.cancelledAt
        ? <span className="badge badge-outline">Cancelled</span>
        : task.completed
            ? <span className="badge badge-completed">Completed</span>
            : <span className="badge badge-open">Open</span>;

    const deleteAction = deleteTask.bind(null, task.id);

    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1>Task</h1>
                    <div className="text-muted-foreground">
                        {statusBadge}
                        <small style={{ marginLeft: ".5rem" }}>Last updated {updated}</small>
                    </div>
                </div>

                <div className="actions-flex" style={{ gridTemplateColumns: "110px 110px 110px" }}>
                    <span className="action-slot">
                        <Link href="/tasks" className="btn btn-outline">Back</Link>
                    </span>
                    <span className="action-slot">
                        <Link href={`/tasks/${task.id}/edit`} className="btn btn-outline">Edit</Link>
                    </span>
                    <DeleteTaskButton deleteAction={deleteAction} />
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Details</div>
                </div>
                <div className="card-content">
                    <div className="grid grid-2">
                        <div className="field">
                            <label className="label">Title</label>
                            <div>{task.title}</div>
                        </div>

                        <div className="field">
                            <label className="label">Asset</label>
                            <div>
                                {task.asset ? (
                                    <Link href={`/assets/${task.asset.id}`}>{task.asset.name}</Link>
                                ) : (
                                    <span className="text-muted-foreground">- None -</span>
                                )}
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Template</label>
                            <div>
                                {templateInfo ? (
                                    <div>
                                        <Link href={`/tasks/templates/${task.template?.id}/edit`}>{task.template?.title}</Link>
                                        {templateMeta ? (
                                            <div className="text-xs text-muted-foreground">{templateMeta}</div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">One-off</span>
                                )}
                            </div>
                        </div>

                        <div className="field">
                            <label className="label">Due date</label>
                            <div>{due}</div>
                        </div>

                        <div className="field">
                            <label className="label">Recurring</label>
                            {task.isRecurring ? (
                                <div className="text-muted-foreground" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                    <span>{describeCadence(task.recurrenceMonths)}</span>
                                    <span>
                                        Next is {task.nextDueDate ? task.nextDueDate.toISOString().slice(0, 10) : "--"}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-muted-foreground">No</span>
                            )}
                        </div>

                        <div className="field">
                            <label className="label">Status</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                {statusBadge}
                                {task.cancelledAt && (
                                    <span className="text-xs text-muted-foreground">
                                        Cancelled {task.cancelledAt.toISOString().slice(0, 10)}{task.cancelReason ? ` - ${task.cancelReason}` : ""}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Notes</label>
                        <div style={{ whiteSpace: "pre-wrap" }}>
                            {task.notes ? task.notes : <span className="text-muted-foreground">-</span>}
                        </div>
                    </div>

                    <div className="text-muted-foreground" style={{ marginTop: "1rem", fontSize: ".85rem" }}>
                        <div>Created: {created}</div>
                        <div>Updated: {updated}</div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-start", gap: ".5rem", marginTop: "1rem" }}>
                        <Link href={`/tasks/${task.id}/edit`} className="btn btn-outline">Edit</Link>
                        <Link href="/tasks" className="btn btn-outline">Back</Link>
                    </div>
                </div>
            </div>
        <AttachmentsPanel
            targetType="task"
            targetId={task.id}
            heading="Documents"
            description="Attach invoices, photos, and receipts associated with this task."
        />
        </main>
    );
}










