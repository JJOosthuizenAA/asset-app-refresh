// src/app/tasks/templates/[id]/edit/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { runMaintenanceScheduler } from "@/lib/task-scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_RECURRENCE_MONTHS = 1;

async function updateTemplateAction(formData: FormData) {
    "use server";
    const accountId = await requireAccountId();

    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing template id");

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

    const existing = await prisma.maintenanceTemplate.findFirst({
        where: { id, accountId },
        select: { id: true },
    });
    if (!existing) throw new Error("Template not found");

    await prisma.maintenanceTemplate.update({
        where: { id },
        data: {
            title,
            notes,
            cadenceMonths,
            leadTimeDays,
            startDate,
            assetId,
            active,
        },
    });

    if (active) {
        await runMaintenanceScheduler({ accountId, lookaheadMonths: cadenceMonths });
    }

    revalidatePath("/tasks");
    revalidatePath("/tasks/templates");
    redirect("/tasks/templates");
}

async function runTemplateSchedulerAction(formData: FormData) {
    "use server";
    const accountId = await requireAccountId();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing template id");

    const template = await prisma.maintenanceTemplate.findFirst({
        where: { id, accountId },
        select: { cadenceMonths: true },
    });
    if (!template) throw new Error("Template not found");

    await runMaintenanceScheduler({ accountId, lookaheadMonths: template.cadenceMonths });
    revalidatePath("/tasks");
    revalidatePath("/tasks/templates");
}

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
    const accountId = await requireAccountId();
    const template = await prisma.maintenanceTemplate.findFirst({
        where: { id: params.id, accountId },
        select: {
            id: true,
            title: true,
            notes: true,
            cadenceMonths: true,
            leadTimeDays: true,
            startDate: true,
            active: true,
            assetId: true,
            asset: { select: { id: true, name: true } },
        },
    });

    if (!template) notFound();

    const assets = await prisma.asset.findMany({
        where: { accountId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    const start = template.startDate ? template.startDate.toISOString().slice(0, 10) : "";

    return (
        <main className="container py-8">
            <h1>Edit Maintenance Template</h1>

            <form action={updateTemplateAction} className="card" style={{ maxWidth: 640, marginTop: "1rem" }}>
                <input type="hidden" name="id" value={template.id} />
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="field">
                        <label className="label" htmlFor="title">Title <span className="req">*</span></label>
                        <input id="title" name="title" type="text" required defaultValue={template.title} />
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="notes">Notes</label>
                        <textarea id="notes" name="notes" rows={3} defaultValue={template.notes ?? ""} />
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="assetId">Asset</label>
                        <select id="assetId" name="assetId" defaultValue={template.assetId ?? ""}>
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
                                <input
                                    id="cadenceMonths"
                                    name="cadenceMonths"
                                    type="number"
                                    min={MIN_RECURRENCE_MONTHS}
                                    step={1}
                                    defaultValue={template.cadenceMonths}
                                />
                                <span className="text-muted-foreground">month(s)</span>
                            </div>
                        </div>
                        <div className="field">
                            <label className="label" htmlFor="leadTimeDays">Lead time (days)</label>
                            <input
                                id="leadTimeDays"
                                name="leadTimeDays"
                                type="number"
                                min={0}
                                step={1}
                                defaultValue={template.leadTimeDays}
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="startDate">First due date</label>
                        <input id="startDate" name="startDate" type="date" defaultValue={start} />
                    </div>

                    <div className="field" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input id="active" name="active" type="checkbox" defaultChecked={template.active} />
                        <label htmlFor="active" className="label" style={{ margin: 0 }}>Template is active</label>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        <button type="submit" className="btn btn-primary">Save changes</button>
                        <Link href="/tasks/templates" className="btn btn-outline">Cancel</Link>
                    </div>
                </div>
            </form>

            <div className="card" style={{ maxWidth: 640, marginTop: "1rem" }}>
                <div className="card-content" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div className="card-title">Generate upcoming task</div>
                        <p className="text-muted-foreground">Runs the scheduler using this template cadence.</p>
                    </div>
                    <form action={runTemplateSchedulerAction}>
                        <input type="hidden" name="id" value={template.id} />
                        <button type="submit" className="btn btn-outline">Run scheduler</button>
                    </form>
                </div>
            </div>
        </main>
    );
}

