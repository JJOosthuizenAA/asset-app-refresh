// src/app/tasks/templates/new/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { runMaintenanceScheduler } from "@/lib/task-scheduler";
import { adjustToNextBusinessDay } from "@/lib/recurring-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_RECURRENCE_MONTHS = 1;

async function createTemplateAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();

    const title = String(formData.get("title") ?? "").trim();
    if (!title) throw new Error("Title is required");

    const notesRaw = (formData.get("notes") as string | null) ?? null;
    const notes = notesRaw ? notesRaw.trim() : null;

    const cadenceRaw = Number(formData.get("cadenceMonths") ?? "0");
    if (!Number.isFinite(cadenceRaw) || cadenceRaw < MIN_RECURRENCE_MONTHS) {
        throw new Error("Recurrence must be at least one month");
    }
    const cadenceMonths = Math.round(cadenceRaw);

    const leadTimeDaysRaw = Number(formData.get("leadTimeDays") ?? "0");
    const leadTimeDays = Number.isFinite(leadTimeDaysRaw) && leadTimeDaysRaw > 0
        ? Math.round(leadTimeDaysRaw)
        : 0;

    const startDateStr = String(formData.get("startDate") ?? "").trim();
    const startDate = startDateStr ? new Date(startDateStr) : null;

    const active = formData.get("active") === "on";

    const assetIdRaw = String(formData.get("assetId") ?? "").trim() || null;
    let assetId: string | null = null;
    if (assetIdRaw) {
        const asset = await prisma.asset.findFirst({
            where: { id: assetIdRaw, accountId },
            select: { id: true },
        });
        if (!asset) throw new Error("Invalid asset selection");
        assetId = asset.id;
    }

    const initialDue = startDate ?? new Date();
    const nextScheduledAt = adjustToNextBusinessDay(initialDue);

    const template = await prisma.maintenanceTemplate.create({
        data: {
            accountId,
            title,
            notes,
            cadenceMonths,
            leadTimeDays,
            startDate,
            assetId,
            active,
            nextScheduledAt,
        },
        select: { accountId: true, active: true, cadenceMonths: true },
    });

    if (template.active) {
        const months = Math.max(template.cadenceMonths ?? cadenceMonths, MIN_RECURRENCE_MONTHS);
        await runMaintenanceScheduler({ accountId: template.accountId, lookaheadMonths: months });
    }

    revalidatePath("/tasks");
    revalidatePath("/tasks/templates");
    redirect("/tasks/templates");
}

export default async function NewTemplatePage() {
    const accountId = await requireAccountId();

    const assets = await prisma.asset.findMany({
        where: { accountId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    const today = new Date().toISOString().slice(0, 10);

    return (
        <main className="container py-8">
            <h1>New Maintenance Template</h1>

            <form action={createTemplateAction} className="card" style={{ maxWidth: 640, marginTop: "1rem" }}>
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="field">
                        <label className="label" htmlFor="title">Title <span className="req">*</span></label>
                        <input id="title" name="title" type="text" required placeholder="Water filter change" />
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="notes">Notes</label>
                        <textarea id="notes" name="notes" rows={3} placeholder="Optional instructions or reminders" />
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="assetId">Asset</label>
                        <select id="assetId" name="assetId" defaultValue="">
                            <option value="">No specific asset</option>
                            {assets.map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                    {asset.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-2">
                        <div className="field">
                            <label className="label" htmlFor="cadenceMonths">Repeats every <span className="req">*</span></label>
                            <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                                <input id="cadenceMonths" name="cadenceMonths" type="number" min={MIN_RECURRENCE_MONTHS} step={1} defaultValue={3} />
                                <span className="text-muted-foreground">month(s)</span>
                            </div>
                        </div>
                        <div className="field">
                            <label className="label" htmlFor="leadTimeDays">Lead time (days)</label>
                            <input id="leadTimeDays" name="leadTimeDays" type="number" min={0} step={1} defaultValue={7} />
                            <p className="text-xs text-muted-foreground" style={{ marginTop: 4 }}>
                                Tasks appear this many days before they are due.
                            </p>
                        </div>
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="startDate">First due date</label>
                        <input id="startDate" name="startDate" type="date" defaultValue={today} />
                    </div>

                    <div className="field" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input id="active" name="active" type="checkbox" defaultChecked />
                        <label htmlFor="active" className="label" style={{ margin: 0 }}>Template is active</label>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        <button type="submit" className="btn btn-primary">Create template</button>
                        <Link href="/tasks/templates" className="btn btn-outline">Cancel</Link>
                    </div>
                </div>
            </form>
        </main>
    );
}


