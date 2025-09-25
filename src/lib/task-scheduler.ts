// src/lib/task-scheduler.ts
import { prisma } from "@/lib/db";
import { logCreate } from "@/lib/activity";
import { adjustToNextBusinessDay } from "@/lib/recurring-tasks";
import { addMonths, startOfDay, subDays } from "date-fns";

type SchedulerOptions = {
    accountId?: string;
    lookaheadMonths?: number;
    now?: Date;
};

type SchedulerResult = {
    processed: number;
    created: number;
    templates: Array<{
        templateId: string;
        created: number;
        nextDue: string | null;
        skippedReason?: string;
    }>;
};

const DEFAULT_LOOKAHEAD_MONTHS = 12;
const MAX_ITERATIONS_PER_TEMPLATE = 48; // safety guard (~4 years for quarterly cadence)

function asStartOfDay(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    return startOfDay(new Date(value));
}

function computeInitialDueDate(template: {
    nextScheduledAt: Date | null;
    lastGeneratedAt: Date | null;
    startDate: Date | null;
    cadenceMonths: number;
}, now: Date): Date {
    const next = asStartOfDay(template.nextScheduledAt);
    if (next) return adjustToNextBusinessDay(next);

    const cadence = Math.max(1, template.cadenceMonths);
    const last = asStartOfDay(template.lastGeneratedAt);
    if (last) {
        return adjustToNextBusinessDay(addMonths(last, cadence));
    }

    const first = asStartOfDay(template.startDate);
    if (first) return adjustToNextBusinessDay(first);

    return adjustToNextBusinessDay(now);
}

export async function runMaintenanceScheduler(options: SchedulerOptions = {}): Promise<SchedulerResult> {
    const now = startOfDay(options.now ?? new Date());
    const lookaheadMonths = options.lookaheadMonths ?? DEFAULT_LOOKAHEAD_MONTHS;
    const horizon = startOfDay(addMonths(now, lookaheadMonths));

    const templates = await prisma.maintenanceTemplate.findMany({
        where: {
            active: true,
            ...(options.accountId ? { accountId: options.accountId } : {}),
        },
        select: {
            id: true,
            accountId: true,
            title: true,
            notes: true,
            cadenceMonths: true,
            leadTimeDays: true,
            startDate: true,
            assetId: true,
            asset: { select: { id: true, status: true } },
            active: true,
            lastGeneratedAt: true,
            nextScheduledAt: true,
        },
        orderBy: {
            nextScheduledAt: "asc",
        },
    });

    const result: SchedulerResult = { processed: templates.length, created: 0, templates: [] };

    for (const template of templates) {
        const detail: SchedulerResult["templates"][number] = {
            templateId: template.id,
            created: 0,
            nextDue: null,
        };

        if (template.asset && template.asset.status && template.asset.status !== "Active") {
            detail.skippedReason = `asset status ${template.asset.status}`;
            result.templates.push(detail);
            continue;
        }

        if (template.cadenceMonths <= 0) {
            detail.skippedReason = "cadenceMonths must be greater than zero";
            result.templates.push(detail);
            continue;
        }

        let due = computeInitialDueDate(template, now);
        let iterations = 0;
        let lastCreatedDue: Date | null = null;
        const cadence = Math.max(1, template.cadenceMonths);

        while (due <= horizon && iterations < MAX_ITERATIONS_PER_TEMPLATE) {
            iterations += 1;
            const availableFrom = startOfDay(subDays(due, Math.max(0, template.leadTimeDays)));
            const nextDueCandidate = adjustToNextBusinessDay(addMonths(due, cadence));

            if (availableFrom > now) {
                // Not yet inside lead window; keep the current due as the next scheduled one.
                break;
            }

            const existing = await prisma.maintenanceTask.findFirst({
                where: {
                    templateId: template.id,
                    dueDate: due,
                },
                select: { id: true },
            });

            if (!existing) {
                const task = await prisma.maintenanceTask.create({
                    data: {
                        title: template.title,
                        notes: template.notes,
                        dueDate: due,
                        nextDueDate: nextDueCandidate,
                        isRecurring: true,
                        recurrenceMonths: cadence,
                        assetId: template.assetId ?? undefined,
                        templateId: template.id,
                    },
                    select: { id: true },
                });

                await logCreate("MaintenanceTask", task.id, {
                    templateId: template.id,
                    dueDate: due.toISOString(),
                });

                detail.created += 1;
                result.created += 1;
                lastCreatedDue = due;
            }

            if (nextDueCandidate.getTime() === due.getTime()) {
                break;
            }
            due = nextDueCandidate;
        }

        detail.nextDue = due.toISOString();

        const update: Partial<{ lastGeneratedAt: Date; nextScheduledAt: Date }> = {};
        if (lastCreatedDue) {
            update.lastGeneratedAt = lastCreatedDue;
        }
        const templateNext = asStartOfDay(template.nextScheduledAt);
        if (!templateNext || templateNext.getTime() !== due.getTime()) {
            update.nextScheduledAt = due;
        }
        if (Object.keys(update).length > 0) {
            await prisma.maintenanceTemplate.update({
                where: { id: template.id },
                data: update,
            });
        }

        result.templates.push(detail);
    }

    return result;
}
