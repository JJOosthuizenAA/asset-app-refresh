// src/app/api/maintenance/scheduler/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAccountId } from "@/lib/current-account";
import { runMaintenanceScheduler } from "@/lib/task-scheduler";

export async function POST(req: Request) {
    const accountId = await requireAccountId();

    let lookaheadMonths: number | undefined;
    try {
        const body = await req.json();
        if (body && body.lookaheadMonths !== undefined) {
            const parsed = Number(body.lookaheadMonths);
            if (!Number.isNaN(parsed) && parsed > 0) {
                lookaheadMonths = parsed;
            }
        } else if (body && body.lookaheadDays !== undefined) {
            const parsed = Number(body.lookaheadDays);
            if (!Number.isNaN(parsed) && parsed > 0) {
                lookaheadMonths = Math.max(1, Math.round(parsed / 30));
            }
        }

    } catch {
        // ignore malformed JSON
    }

    const result = await runMaintenanceScheduler({ accountId, lookaheadMonths });

    revalidatePath("/tasks");
    revalidatePath("/tasks/templates");

    return NextResponse.json(result);
}
