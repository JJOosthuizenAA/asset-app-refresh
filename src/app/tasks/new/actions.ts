"use server";

import { prisma } from "@/lib/db";
import { ensureUnknownSupplier } from "@/lib/suppliers";
import { requireAccountId } from "@/lib/current-account";
import { SELF_OPTION } from "../shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "date-fns";
import { adjustToNextBusinessDay } from "@/lib/recurring-tasks";

const MIN_RECURRENCE_MONTHS = 1;

function asString(value: FormDataEntryValue | null): string | null {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
}

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

    const supplierSelection = asString(formData.get("preferredSupplierId"));
    const fallbackSupplierId = await ensureUnknownSupplier(prisma, accountId);
    let preferredSupplierId: string | null = null;
    let selfServiceSelected = false;
    if (supplierSelection === SELF_OPTION) {
        selfServiceSelected = true;
    } else if (supplierSelection) {
        const supplier = await prisma.supplier.findFirst({
            where: { id: supplierSelection, accountId },
            select: { id: true },
        });
        if (!supplier) throw new Error("Selected supplier not found for this account.");
        preferredSupplierId = supplier.id;
    } else {
        preferredSupplierId = fallbackSupplierId;
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
            preferredSupplierId,
            selfServiceSelected,
            isRecurring,
            recurrenceMonths,
            nextDueDate,
        },
    });

    revalidatePath("/tasks");
    redirect("/tasks");
}

