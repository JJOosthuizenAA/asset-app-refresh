// src/app/tasks/new/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { createTaskAction } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_RECURRENCE_MONTHS = 1;

export default async function NewTaskPage() {
    const accountId = await requireAccountId();

    const assets = await prisma.asset.findMany({
        where: { accountId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>New Task</h1>
                <Link href="/tasks" className="btn btn-outline">Back</Link>
            </div>

            <form action={createTaskAction} className="card">
                <div className="card-header">
                    <div className="card-title">Details</div>
                </div>

                <div className="card-content">
                    <div className="grid grid-2">
                        <div className="field">
                            <label htmlFor="title" className="label">Title <span className="req">*</span></label>
                            <input id="title" name="title" type="text" required placeholder="e.g. Annual Service" />
                        </div>

                        <div className="field">
                            <label htmlFor="assetId" className="label">Asset</label>
                            <select id="assetId" name="assetId" defaultValue="">
                                <option value="">-- None --</option>
                                {assets.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="dueDate" className="label">Due date</label>
                            <input id="dueDate" name="dueDate" type="date" />
                        </div>

                        <div className="field">
                            <label className="label" htmlFor="isRecurring">Recurring</label>
                            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                                <input id="isRecurring" name="isRecurring" type="checkbox" />
                                <label htmlFor="isRecurring" className="text-muted-foreground" style={{ cursor: "pointer" }}>
                                    Generate follow-up tasks automatically
                                </label>
                            </div>
                            <div className="field" style={{ marginTop: ".5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                                    <input
                                        id="recurrenceMonths"
                                        name="recurrenceMonths"
                                        type="number"
                                        min={MIN_RECURRENCE_MONTHS}
                                        step={1}
                                        placeholder="e.g. 6"
                                    />
                                    <span className="text-muted-foreground">month(s)</span>
                                </div>
                                <p className="text-xs text-muted-foreground" style={{ marginTop: 4 }}>
                                    Provide a due date when enabling recurrence.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="field">
                        <label htmlFor="notes" className="label">Notes</label>
                        <textarea id="notes" name="notes" rows={4} placeholder="Extra detail..."></textarea>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-start", gap: ".5rem" }}>
                        <Link href="/tasks" className="btn btn-outline">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>

                </div>
            </form>
        </main>
    );
}

