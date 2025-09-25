// src/lib/activity.ts
"use server";

import { prisma } from "@/lib/db";

/**
 * Allow known entity kinds plus string for forward-compat.
 */
export type EntityType =
        | "Asset"
    | "MaintenanceTask"
    | "Document"
    | "Warranty"
    | (string & {});

type BaseLog = {
    entityType: EntityType;
    entityId: string;
    userId?: string | null;
    details?: unknown;
};

async function writeLog(action: "Created" | "Updated" | "Deleted", base: BaseLog) {
    const { entityType, entityId, userId, details } = base;
    try {
        const data: any = {
            action,
            entityType,
            entityId,
            ...(userId ? { userId } : {}),
        };
        if (details !== undefined) {
            data.details = typeof details === "string" ? details : JSON.stringify(details);
        }
        await prisma.activityLog.create({ data });
    } catch (e) {
        console.error("activityLog.create error:", e);
    }
}

export async function logCreate(
    entityType: EntityType,
    entityId: string,
    nameOrDetails?: string | Record<string, unknown>,
    userId?: string | null
) {
    await writeLog("Created", { entityType, entityId, userId, details: nameOrDetails });
}

export async function logUpdate(
    entityType: EntityType,
    entityId: string,
    details?: Record<string, unknown> | string,
    userId?: string | null
) {
    await writeLog("Updated", { entityType, entityId, userId, details });
}

export async function logDelete(
    entityType: EntityType,
    entityId: string,
    details?: Record<string, unknown> | string,
    userId?: string | null
) {
    await writeLog("Deleted", { entityType, entityId, userId, details });
}

/**
 * Back-compat shim for older imports:
 *   logActivity(action, entityType, entityId, details?, userId?)
 */
export async function logActivity(
    action: "Created" | "Updated" | "Deleted",
    entityType: EntityType,
    entityId: string,
    details?: unknown,
    userId?: string | null
) {
    await writeLog(action, { entityType, entityId, userId, details });
}


