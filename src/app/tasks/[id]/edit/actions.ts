// src/app/tasks/[id]/edit/actions.ts
"use server";

import { prisma } from "@/lib/db";
import { ensureUnknownSupplier } from "@/lib/suppliers";
import { requireAccountId } from "@/lib/current-account";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "date-fns";
import { handleRecurringTransition, type RecurringTaskSnapshot, adjustToNextBusinessDay } from "@/lib/recurring-tasks";
import { SELF_OPTION } from "../../shared";

const MIN_RECURRENCE_MONTHS = 1;

function asString(v: FormDataEntryValue | null) {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
}
function parseDate(v: FormDataEntryValue | null) {
    const s = asString(v);
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

export async function updateTask(id: string, formData: FormData) {
    const accountId = await requireAccountId();

    const owned = await prisma.maintenanceTask.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            notes: true,
            dueDate: true,
            completed: true,
            isRecurring: true,
            recurrenceMonths: true,
            nextDueDate: true,
            assetId: true,
            templateId: true,
            cancelledAt: true,
            cancelReason: true,
            preferredSupplierId: true,
            selfServiceSelected: true,
            asset: { select: { id: true, accountId: true } },
        },
    });
    if (!owned || (owned.asset && owned.asset.accountId !== accountId)) {
        throw new Error("Task not found");
    }

    const title = asString(formData.get("title"));
    const notes = asString(formData.get("notes"));
    const dueDate = parseDate(formData.get("dueDate"));
    const completed = String(formData.get("completed")) === "on";

    if (!title) return { ok: false as const, error: "Title is required." };

    const rawAssetId = asString(formData.get("assetId"));
    const assetId = rawAssetId || null;

    if (assetId) {
        const valid = await prisma.asset.findFirst({
            where: { id: assetId, accountId },
            select: { id: true },
        });
        if (!valid) throw new Error("Invalid asset");
    }

    const supplierSelection = asString(formData.get("preferredSupplierId"));
    const fallbackSupplierId = await ensureUnknownSupplier(prisma, accountId);
    let preferredSupplierId: string | null = owned.preferredSupplierId ?? fallbackSupplierId;
    let selfServiceSelected = owned.selfServiceSelected ?? false;

    if (supplierSelection === SELF_OPTION) {
        selfServiceSelected = true;
        preferredSupplierId = null;
    } else if (supplierSelection) {
        const supplier = await prisma.supplier.findFirst({
            where: { id: supplierSelection, accountId },
            select: { id: true },
        });
        if (!supplier) throw new Error("Selected supplier not found for this account.");
        preferredSupplierId = supplier.id;
        selfServiceSelected = false;
    } else if (!owned.preferredSupplierId && !owned.selfServiceSelected) {
        preferredSupplierId = fallbackSupplierId;
        selfServiceSelected = false;
    }

    const isRecurring = String(formData.get("isRecurring") ?? "") === "on";
    const recurrenceRaw = Number(formData.get("recurrenceMonths") ?? "0");
    const recurrenceMonths = isRecurring
        ? Math.max(MIN_RECURRENCE_MONTHS, Math.round(Number.isFinite(recurrenceRaw) ? recurrenceRaw : 0))
        : null;

    let effectiveDueDate = dueDate ?? owned.dueDate;
    if (isRecurring && !effectiveDueDate) {
        throw new Error("Recurring tasks require a due date");
    }

    const nextDueDate = isRecurring && recurrenceMonths && effectiveDueDate
        ? adjustToNextBusinessDay(addMonths(effectiveDueDate, recurrenceMonths))
        : null;

    const before: RecurringTaskSnapshot = {
        id: owned.id,
        title: owned.title,
        notes: owned.notes,
        dueDate: owned.dueDate,
        nextDueDate: owned.nextDueDate,
        completed: owned.completed,
        isRecurring: owned.isRecurring,
        recurrenceMonths: owned.recurrenceMonths,
        assetId: owned.assetId,
        templateId: owned.templateId,
        cancelledAt: owned.cancelledAt,
    };

    const after: RecurringTaskSnapshot = {
        id: owned.id,
        title,
        notes,
        dueDate: effectiveDueDate,
        nextDueDate,
        completed,
        isRecurring,
        recurrenceMonths,
        assetId,
        templateId: owned.templateId,
        cancelledAt: isRecurring ? owned.cancelledAt : null,
    };

    await prisma.$transaction(async (tx) => {
        await tx.maintenanceTask.update({
            where: { id },
            data: {
                title,
                notes,
                dueDate: effectiveDueDate,
                completed,
                assetId,
                preferredSupplierId,
                selfServiceSelected,
                isRecurring,
                recurrenceMonths,
                nextDueDate,
                ...(isRecurring ? {} : { cancelledAt: null, cancelReason: null }),
            },
        });

        await handleRecurringTransition({ before, after, tx });
    });

    revalidatePath(`/tasks/${id}`);
    redirect(`/tasks/${id}?ok=updated`);
}

export async function deleteTask(id: string) {
    const accountId = await requireAccountId();

    const owned = await prisma.maintenanceTask.findFirst({
        where: {
            id,
            OR: [
                { asset: { accountId } },
                { template: { accountId } },
            ],
        },
        select: { id: true },
    });
    if (!owned) throw new Error("Task not found");

    await prisma.maintenanceTask.delete({ where: { id } });
    revalidatePath("/tasks");
    redirect("/tasks?ok=deleted");
}



