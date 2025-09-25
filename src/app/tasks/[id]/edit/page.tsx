import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import DeleteTaskButton from "./DeleteTaskButton";
import { updateTask, deleteTask } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_RECURRENCE_MONTHS = 1;

export default async function EditTaskPage({ params }: { params: { id: string } }) {
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
            assetId: true,
            asset: { select: { id: true, name: true, accountId: true } },
        },
    });

    if (!task || (task.asset && task.asset.accountId !== accountId)) notFound();

    const assets = await prisma.asset.findMany({
        where: { accountId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    const updateAction = updateTask.bind(null, task.id);
    const deleteAction = deleteTask.bind(null, task.id);

    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>Edit Task</h1>

                <div className="actions-flex" style={{ gridTemplateColumns: "110px 110px" }}>
                    <span className="action-slot">
                        <Link href="/tasks" className="btn btn-outline">Back</Link>
                    </span>

                    <DeleteTaskButton deleteAction={deleteAction} />
                </div>
            </div>

            <form action={updateAction} className="card">
                <div className="card-header">
                    <div className="card-title">Details</div>
                </div>

                <div className="card-content">
                    <div className="grid grid-2">
                        <div className="field">
                            <label htmlFor="title" className="label">Title <span className="req">*</span></label>
                            <input id="title" name="title" type="text" required defaultValue={task.title} />
                        </div>

                        <div className="field">
                            <label htmlFor="assetId" className="label">Asset</label>
                            <select id="assetId" name="assetId" defaultValue={task.assetId ?? ""}>
                                <option value="">- None -</option>
                                {assets.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="dueDate" className="label">Due date</label>
                            <p className="text-xs text-muted-foreground" style={{ marginBottom: 6 }}>
                                Provide a due date when enabling recurrence.
                            </p>
                            <input
                                id="dueDate"
                                name="dueDate"
                                type="date"
                                defaultValue={task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""}
                            />
                        </div>

                        <div className="field">
                            <label className="label" htmlFor="completed">Status</label>
                            <div className="field-inline">
                                <input id="completed" name="completed" type="checkbox" defaultChecked={task.completed} />
                                <label htmlFor="completed" className="text-muted-foreground" style={{ cursor: "pointer" }}>
                                    Mark as completed
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="isRecurring">Recurring</label>
                        <div className="field-inline">
                            <input id="isRecurring" name="isRecurring" type="checkbox" defaultChecked={task.isRecurring} />
                            <label htmlFor="isRecurring" className="text-muted-foreground" style={{ cursor: "pointer" }}>
                                Generate follow-up tasks automatically
                            </label>
                        </div>
                        <div className="input-with-suffix" style={{ marginTop: ".5rem" }}>
                            <input
                                id="recurrenceMonths"
                                name="recurrenceMonths"
                                type="number"
                                min={MIN_RECURRENCE_MONTHS}
                                step={1}
                                defaultValue={task.recurrenceMonths ?? ""}
                                placeholder="e.g. 6"
                            />
                            <span className="suffix">month(s)</span>
                        </div>
                        {task.nextDueDate ? (
                            <p className="text-xs text-muted-foreground" style={{ marginTop: 4 }}>
                                Next occurrence preview: {task.nextDueDate.toISOString().slice(0, 10)}
                            </p>
                        ) : null}
                    </div>

                    <div className="field">
                        <label htmlFor="notes" className="label">Notes</label>
                        <textarea id="notes" name="notes" rows={4} defaultValue={task.notes ?? ""}></textarea>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-start", gap: ".5rem", marginTop: "1rem" }}>
                        <Link href="/tasks" className="btn btn-outline">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </main>
    );
}
