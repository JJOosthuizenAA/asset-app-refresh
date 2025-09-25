// src/lib/recurring-tasks.ts
import { addDays, addMonths, startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";

export type RecurringTaskSnapshot = {
    id: string;
    title: string;
    notes: string | null;
    dueDate: Date | null;
    nextDueDate: Date | null;
    completed: boolean;
    isRecurring: boolean;
    recurrenceMonths: number | null;
    assetId: string | null;
    templateId: string | null;
    cancelledAt: Date | null;
};

export function adjustToNextBusinessDay(input: Date): Date {
    let result = startOfDay(input);
    const day = result.getDay();
    if (day === 0) {
        result = startOfDay(addDays(result, 1));
    } else if (day === 6) {
        result = startOfDay(addDays(result, 2));
    }
    return result;
}



export function computeNextDueDate(snapshot: Pick<RecurringTaskSnapshot, "dueDate" | "recurrenceMonths"> & { nextDueDate?: Date | null }): Date | null {
    if (!snapshot.recurrenceMonths || snapshot.recurrenceMonths < 1) return null;
    if (snapshot.nextDueDate) return adjustToNextBusinessDay(snapshot.nextDueDate);
    if (!snapshot.dueDate) return null;
    return adjustToNextBusinessDay(addMonths(snapshot.dueDate, snapshot.recurrenceMonths));
}

type TxClient = Prisma.TransactionClient;

type TransitionArgs = {
    before: RecurringTaskSnapshot;
    after: RecurringTaskSnapshot;
    tx: TxClient;
};

export async function handleRecurringTransition({ before, after, tx }: TransitionArgs): Promise<void> {
    if (!after.isRecurring || !after.recurrenceMonths || after.recurrenceMonths < 1) {
        return;
    }

    if (after.cancelledAt) {
        return;
    }

    // Ensure the record keeps an accurate preview of the upcoming occurrence.
    const nextDue = computeNextDueDate(after);
    if (nextDue && (!after.nextDueDate || after.nextDueDate.getTime() !== nextDue.getTime())) {
        await tx.maintenanceTask.update({
            where: { id: after.id },
            data: { nextDueDate: nextDue },
        });
        after = { ...after, nextDueDate: nextDue };
    }

    const recurrence = after.recurrenceMonths;

    if (!before.completed && after.completed) {
        if (!after.nextDueDate) return;
        const followUpDue = adjustToNextBusinessDay(after.nextDueDate);
        const followUpNext = adjustToNextBusinessDay(addMonths(followUpDue, recurrence));

        await tx.maintenanceTask.create({
            data: {
                title: after.title,
                notes: after.notes,
                dueDate: followUpDue,
                nextDueDate: followUpNext,
                isRecurring: true,
                recurrenceMonths: recurrence,
                assetId: after.assetId ?? undefined,
                templateId: after.templateId ?? undefined,
            },
        });

        if (after.templateId) {
            await tx.maintenanceTemplate.update({
                where: { id: after.templateId },
                data: {
                    lastGeneratedAt: followUpDue,
                    nextScheduledAt: followUpNext,
                },
            });
        }
        return;
    }

    if (before.completed && !after.completed) {
        const expectedDue = after.nextDueDate ?? computeNextDueDate(after);
        if (!expectedDue) return;

        const followUp = await tx.maintenanceTask.findFirst({
            where: {
                templateId: after.templateId ?? undefined,
                assetId: after.assetId ?? undefined,
                dueDate: expectedDue,
                isRecurring: true,
                cancelledAt: null,
                completed: false,
            },
            orderBy: { createdAt: "desc" },
        });

        if (followUp) {
            await tx.maintenanceTask.update({
                where: { id: followUp.id },
                data: {
                    cancelledAt: new Date(),
                    cancelReason: "Previous occurrence reopened",
                },
            });
        }
    }
}
