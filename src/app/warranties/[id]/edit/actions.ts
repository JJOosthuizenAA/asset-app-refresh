// src/app/warranties/[id]/edit/actions.ts
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccountId } from "@/lib/current-account";

function asString(v: FormDataEntryValue | null) {
    return typeof v === "string" ? v.trim() : "";
}
function parseDate(v: string | undefined | null): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
}

export type EditWarrantyFormState = {
    ok?: boolean;
    error?: string;
};

export async function updateWarrantyAction(
    _prevState: EditWarrantyFormState,
    formData: FormData,
): Promise<EditWarrantyFormState> {
    const accountId = await requireAccountId();

    const id = asString(formData.get("id"));
    const name = asString(formData.get("name"));
    const provider = asString(formData.get("provider"));
    const policyNo = asString(formData.get("policyNo"));
    const expiresAtStr = asString(formData.get("expiresAt"));
    const expiresAt = parseDate(expiresAtStr || null);

    if (!id) return { ok: false, error: "Missing warranty id." };
    if (!name) return { ok: false, error: "Name is required." };

    // Ensure this warranty belongs to the same account
    const exists = await prisma.warranty.findFirst({
        where: { id, asset: { accountId } },
        select: { id: true },
    });
    if (!exists) return { ok: false, error: "Warranty not found for this account." };

    await prisma.warranty.update({
        where: { id },
        data: {
            name,
            provider: provider || null,
            policyNo: policyNo || null,
            expiresAt, // may be null
        },
    });

    revalidatePath(`/warranties/${id}`);
    redirect(`/warranties/${id}?ok=updated`);
}

export async function deleteWarrantyAction(
    _prevState: EditWarrantyFormState,
    formData: FormData,
): Promise<EditWarrantyFormState> {
    const accountId = await requireAccountId();
    const id = asString(formData.get("id"));
    if (!id) return { ok: false, error: "Missing warranty id." };

    // Scope check
    const exists = await prisma.warranty.findFirst({
        where: { id, asset: { accountId } },
        select: { id: true },
    });
    if (!exists) return { ok: false, error: "Warranty not found for this account." };

    await prisma.warranty.delete({ where: { id } });
    revalidatePath("/warranties");
    redirect("/warranties?ok=deleted");
}


