"use server";

import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "date-fns";
import { adjustToNextBusinessDay } from "@/lib/recurring-tasks";

const MIN_RECURRENCE_MONTHS = 1;

export async function createTaskAction(formData: FormData) {
    const accountId = await requireAccountId();

    const title = (formData.get("title") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim() || null;
    const due = (formData.get("dueDate") as string)?.trim();
    const assetIdRaw = (formData.get("assetId") as string) ?? "";
    const assetId = assetIdRaw ? String(assetIdRaw) : null;

    if (!title) throw new Error("Title is required.");

    const dueDate = due ? new Date(due) : null;

    if (assetId) {
        const valid = await prisma.asset.findFirst({
            where: { id: assetId, accountId },
            select: { id: true },
        });
        if (!valid) throw new Error("Selected asset not found for this account.");
    }

    const isRecurring = (formData.get("isRecurring") as string) === "on";
    const recurrenceRaw = Number(formData.get("recurrenceMonths") ?? "0");
    const recurrenceMonths = isRecurring ? Math.max(MIN_RECURRENCE_MONTHS, Math.round(recurrenceRaw || 0)) : null;

    if (isRecurring && (!recurrenceMonths || !dueDate)) {
        throw new Error("Recurring tasks require a due date and recurrence");
    }

    const nextDueDate = isRecurring && recurrenceMonths && dueDate
        ? adjustToNextBusinessDay(addMonths(dueDate, recurrenceMonths))
        : null;

    await prisma.maintenanceTask.create({
        data: {
            title,
            notes,
            dueDate,
            completed: false,
            assetId,
            isRecurring,
            recurrenceMonths,
            nextDueDate,
        },
    });

    revalidatePath("/tasks");
    redirect("/tasks");
}

