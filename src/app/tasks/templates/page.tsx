// src/app/tasks/templates/page.tsx
import Link from "next/link";
import { Pause, Pencil, Play, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { revalidatePath } from "next/cache";
import { runMaintenanceScheduler } from "@/lib/task-scheduler";
import { ConfirmButton } from "@/components/ConfirmButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDate(value: Date | null): string {
    if (!value) return "--";
    return value.toISOString().slice(0, 10);
}

function describeCadence(months: number): string {
    if (!months || months < 1) return "--";
    return months === 1 ? "Every month" : `Every ${months} months`;
}

async function runSchedulerAction() {
    "use server";
    const accountId = await requireAccountId();
    await runMaintenanceScheduler({ accountId });
    revalidatePath("/tasks");
    revalidatePath("/tasks/templates");
}

async function toggleTemplateAction(formData: FormData) {
    "use server";
    const accountId = await requireAccountId();
    const id = String(formData.get("id") ?? "").trim();
    const nextActive = String(formData.get("active") ?? "").trim().toLowerCase() === "true";

    if (!id) throw new Error("Missing template id");

    const template = await prisma.maintenanceTemplate.findFirst({
        where: { id, accountId },
        select: { id: true },
    });
    if (!template) throw new Error("Template not found");

    await prisma.maintenanceTemplate.update({ where: { id }, data: { active: nextActive } });
    revalidatePath("/tasks");
    revalidatePath("/tasks/templates");
}

async function deleteTemplateAction(formData: FormData) {
    "use server";
    const accountId = await requireAccountId();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) throw new Error("Missing template id");

    const template = await prisma.maintenanceTemplate.findFirst({
        where: { id, accountId },
        select: { id: true },
    });
    if (!template) throw new Error("Template not found");

    await prisma.maintenanceTemplate.delete({ where: { id } });
    revalidatePath("/tasks");
    revalidatePath("/tasks/templates");
}

export default async function MaintenanceTemplatesPage() {
    const accountId = await requireAccountId();

    const templates = await prisma.maintenanceTemplate.findMany({
        where: { accountId },
        orderBy: { title: "asc" },
        select: {
            id: true,
            title: true,
            notes: true,
            cadenceMonths: true,
            leadTimeDays: true,
            startDate: true,
            active: true,
            nextScheduledAt: true,
            asset: { select: { id: true, name: true, status: true } },
            updatedAt: true,
        },
    });

    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ marginBottom: '0.75rem' }}><Link href="/tasks" className="btn btn-outline">Back to Tasks</Link></div>
                    <h1>Maintenance Templates</h1>
                    <p className="text-muted-foreground" style={{ marginTop: 4 }}>
                        Define recurring jobs so follow-up tasks are generated automatically.
                    </p>
                </div>
                <div className="space-x-2">
                    <form action={runSchedulerAction} style={{ display: "inline" }}>
                        <button type="submit" className="btn btn-outline">Run scheduler</button>
                    </form>
                    <Link href="/tasks/templates/new" className="btn btn-primary">New Template</Link>
                </div>
            </div>

            {templates.length === 0 ? (
                <section className="card">
                    <div className="card-content">
                        <p className="text-muted-foreground" style={{ marginBottom: 12 }}>
                            No templates yet. Create one to start scheduling maintenance automatically.
                        </p>
                        <Link href="/tasks/templates/new" className="btn btn-primary">Create Template</Link>
                    </div>
                </section>
            ) : (
                <div className="card">
                    <div className="card-content" style={{ padding: 0 }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: "26%" }}>Template</th>
                                    <th style={{ width: "18%" }}>Asset</th>
                                    <th style={{ width: "16%" }}>Recurrence</th>
                                    <th style={{ width: "12%" }}>Lead time</th>
                                    <th style={{ width: "12%" }}>Next due</th>
                                    <th style={{ width: "12%" }}>Status</th>
                                    <th style={{ width: "12%" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map((t) => (
                                    <tr key={t.id}>
                                        <td>
                                            <div className="font-medium">{t.title}</div>
                                            {t.notes ? (
                                                <div
                                                    className="text-muted-foreground note-preview"
                                                    title={t.notes}
                                                >
                                                    {t.notes}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td>
                                            {t.asset ? (
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <Link href={`/assets/${t.asset.id}`}>{t.asset.name}</Link>
                                                    <span className="text-xs text-muted-foreground">{t.asset.status ?? "Active"}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">--</span>
                                            )}
                                        </td>
                                        <td>{describeCadence(t.cadenceMonths)}</td>
                                        <td className="text-right">{t.leadTimeDays ? `${t.leadTimeDays} day${t.leadTimeDays === 1 ? "" : "s"}` : "Same day"}</td>
                                        <td className="text-right">{formatDate(t.nextScheduledAt)}</td>
                                        <td>
                                            {t.active ? (
                                                <span className="badge badge-open">Active</span>
                                            ) : (
                                                <span className="badge badge-outline">Paused</span>
                                            )}
                                            <div className="text-xs text-muted-foreground" style={{ marginTop: 4 }}>
                                                Updated {formatDate(t.updatedAt)}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="actions-flex templates">
                                                <span className="action-slot">
                                                    <Link
                                                        href={`/tasks/templates/${t.id}/edit`}
                                                        className="btn btn-outline btn-icon"
                                                        aria-label="Edit template"
                                                        title="Edit template"
                                                    >
                                                        <Pencil size={16} aria-hidden="true" />
                                                    </Link>
                                                </span>
                                                <form className="action-slot" action={toggleTemplateAction}>
                                                    <input type="hidden" name="id" value={t.id} />
                                                    <input type="hidden" name="active" value={t.active ? "false" : "true"} />
                                                    <button
                                                        type="submit"
                                                        className="btn btn-outline btn-icon"
                                                        aria-label={t.active ? "Pause template" : "Resume template"}
                                                        title={t.active ? "Pause template" : "Resume template"}
                                                    >
                                                        {t.active ? (
                                                            <Pause size={16} aria-hidden="true" />
                                                        ) : (
                                                            <Play size={16} aria-hidden="true" />
                                                        )}
                                                    </button>
                                                </form>
                                                <form className="action-slot" action={deleteTemplateAction}>
                                                    <input type="hidden" name="id" value={t.id} />
                                                    <ConfirmButton
                                                        className="btn btn-danger btn-icon"
                                                        confirmText="Delete template?"
                                                        aria-label="Delete template"
                                                        title="Delete template"
                                                    >
                                                        <Trash2 size={16} aria-hidden="true" />
                                                    </ConfirmButton>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </main>
    );
}
