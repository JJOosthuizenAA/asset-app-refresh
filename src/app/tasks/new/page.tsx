// src/app/tasks/new/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureUnknownSupplier } from "@/lib/suppliers";
import { requireAccountId } from "@/lib/current-account";
import { createTaskAction } from "./actions";
import { SELF_OPTION } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_RECURRENCE_MONTHS = 1;

export default async function NewTaskPage() {
    const accountId = await requireAccountId();

    const [assets, fallbackSupplierId, suppliers] = await Promise.all([
        prisma.asset.findMany({
            where: { accountId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
        ensureUnknownSupplier(prisma, accountId),
        prisma.supplier.findMany({
            where: { accountId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
    ]);

    const supplierOptions = [
        { id: fallbackSupplierId, name: "Unknown Supplier" },
        ...suppliers.filter((supplier) => supplier.id !== fallbackSupplierId),
    ];

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
                            <label htmlFor="preferredSupplierId" className="label">Preferred supplier</label>
                            <select id="preferredSupplierId" name="preferredSupplierId" defaultValue={fallbackSupplierId}>
                                {supplierOptions.map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </option>
                                ))}
                                <option value={SELF_OPTION}>{"I'll handle this myself"}</option>
                            </select>
                            <small className="text-xs text-muted-foreground">
                                Need someone else? <Link href="/suppliers">Add a supplier</Link> and reload this page.
                            </small>
                        </div>

                        <div className="field">
                            <label htmlFor="dueDate" className="label">Due date</label>
                            <p className="text-xs text-muted-foreground" style={{ marginBottom: 6 }}>
                                Provide a due date when enabling recurrence.
                            </p>
                            <input id="dueDate" name="dueDate" type="date" />
                        </div>
                        <div className="field">
                            <label className="label" htmlFor="isRecurring">Recurring</label>
                            <div className="field-inline">
                                <input id="isRecurring" name="isRecurring" type="checkbox" />
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
                                    placeholder="e.g. 6"
                                />
                                <span className="suffix">month(s)</span>
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

