// src/lib/preferences.ts
import { prisma } from "@/lib/db";

export async function getPref<T = string>(
    accountId: string,
    namespace: string,
    key: string,
    fallback?: T
): Promise<T> {
    const row = await prisma.accountPreference.findUnique({
        where: {
            accountId_namespace_key: { accountId, namespace, key },
        },
        select: { value: true },
    });

    if (!row) return fallback as T;

    // Attempt to coerce: number, boolean, or JSON; otherwise string
    const raw = row.value;
    if (raw === "true") return true as unknown as T;
    if (raw === "false") return false as unknown as T;
    if (!Number.isNaN(Number(raw)) && raw.trim() !== "") {
        return Number(raw) as unknown as T;
    }
    try {
        return JSON.parse(raw) as T;
    } catch {
        return raw as unknown as T;
    }
}

export async function setPref(
    accountId: string,
    namespace: string,
    key: string,
    value: string | number | boolean | object | null
) {
    let toStore: string;
    if (typeof value === "string") toStore = value;
    else if (typeof value === "number" || typeof value === "boolean") toStore = String(value);
    else toStore = JSON.stringify(value);

    await prisma.accountPreference.upsert({
        where: {
            accountId_namespace_key: { accountId, namespace, key },
        },
        update: { value: toStore },
        create: { accountId, namespace, key, value: toStore },
    });
}
