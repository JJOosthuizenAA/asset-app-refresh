// src/app/settings/dashboard/actions.ts
"use server";

import { requireAccountId } from "@/lib/current-account";
import { setPrefs } from "@/lib/preferences";
import { redirect } from "next/navigation";

export async function saveDashboardPrefs(formData: FormData) {
    const accountId = await requireAccountId();

    const tasksDueInDays = Number(formData.get("tasksDueInDays") ?? 7);
    const warrantiesExpiringInDays = Number(formData.get("warrantiesExpiringInDays") ?? 30);
    const overdueGraceDays = Number(formData.get("overdueGraceDays") ?? 0);

    // basic guards
    const clamp = (n: number, min: number, max: number) =>
        Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : min;

    const toSave = {
        tasksDueInDays: clamp(tasksDueInDays, 0, 365),
        warrantiesExpiringInDays: clamp(warrantiesExpiringInDays, 0, 365),
        overdueGraceDays: clamp(overdueGraceDays, 0, 60),
    };

    await setPrefs(accountId, "dashboard", toSave);
    redirect("/settings/dashboard?saved=1");
}
