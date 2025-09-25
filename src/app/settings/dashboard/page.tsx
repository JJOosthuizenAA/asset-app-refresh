// src/app/settings/dashboard/page.tsx
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { getDashboardConfig } from "@/lib/dashboard-config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function saveDashboardConfig(formData: FormData) {
    "use server";
    const accountId = await requireAccountId();

    const tasksDueInDays = Math.max(1, Number(formData.get("tasksDueInDays") ?? 7));
    const warrantiesExpiringInDays = Math.max(1, Number(formData.get("warrantiesExpiringInDays") ?? 30));
    const overdueGraceDays = Math.max(0, Number(formData.get("overdueGraceDays") ?? 0));

    await prisma.accountPreference.upsert({
        where: { accountId_namespace_key: { accountId, namespace: "dashboard", key: "tasksDueInDays" } },
        update: { value: String(tasksDueInDays) },
        create: { accountId, namespace: "dashboard", key: "tasksDueInDays", value: String(tasksDueInDays) },
    });

    await prisma.accountPreference.upsert({
        where: { accountId_namespace_key: { accountId, namespace: "dashboard", key: "warrantiesExpiringInDays" } },
        update: { value: String(warrantiesExpiringInDays) },
        create: { accountId, namespace: "dashboard", key: "warrantiesExpiringInDays", value: String(warrantiesExpiringInDays) },
    });

    await prisma.accountPreference.upsert({
        where: { accountId_namespace_key: { accountId, namespace: "dashboard", key: "overdueGraceDays" } },
        update: { value: String(overdueGraceDays) },
        create: { accountId, namespace: "dashboard", key: "overdueGraceDays", value: String(overdueGraceDays) },
    });

    // ✅ Revalidate the dashboard and redirect
    revalidatePath("/dashboard");
    redirect("/dashboard");
}

export default async function DashboardSettingsPage() {
    const accountId = await requireAccountId();
    const cfg = await getDashboardConfig(accountId);

    return (
        <main className="container py-8">
            <h1>Dashboard Settings</h1>

            <form action={saveDashboardConfig} className="card" style={{ maxWidth: 480, marginTop: "1rem" }}>
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="field">
                        <label className="label" htmlFor="tasksDueInDays">
                            Tasks Due (days ahead) <span className="req">*</span>
                        </label>
                        <input
                            type="number"
                            id="tasksDueInDays"
                            name="tasksDueInDays"
                            defaultValue={cfg.tasksDueInDays}
                            min={1}
                        />
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="warrantiesExpiringInDays">
                            Warranties Expiring (days ahead) <span className="req">*</span>
                        </label>
                        <input
                            type="number"
                            id="warrantiesExpiringInDays"
                            name="warrantiesExpiringInDays"
                            defaultValue={cfg.warrantiesExpiringInDays}
                            min={1}
                        />
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="overdueGraceDays">
                            Overdue Grace (days)
                        </label>
                        <input
                            type="number"
                            id="overdueGraceDays"
                            name="overdueGraceDays"
                            defaultValue={cfg.overdueGraceDays}
                            min={0}
                        />
                    </div>

                    <div style={{ display: "flex", gap: ".5rem", marginTop: "1rem" }}>
                        <button type="submit" className="btn btn-primary">Save</button>
                        <a href="/settings" className="btn btn-outline">Cancel</a>
                    </div>
                </div>
            </form>
        </main>
    );
}
