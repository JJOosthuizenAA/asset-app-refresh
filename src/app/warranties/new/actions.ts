"use server";

import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createWarranty(formData: FormData) {
    const accountId = await requireAccountId();

    const name = (formData.get("name") as string | null)?.trim();
    const provider = (formData.get("provider") as string | null)?.trim() || null;
    const policyNo = (formData.get("policyNo") as string | null)?.trim() || null;
    const expires = (formData.get("expiresAt") as string | null)?.trim() || "";
    const assetId = (formData.get("assetId") as string | null)?.trim();

    if (!name) throw new Error("Name is required");
    if (!assetId) throw new Error("Asset is required");

    const asset = await prisma.asset.findFirst({
        where: { id: assetId, accountId },
        select: { id: true },
    });
    if (!asset) throw new Error("Asset not found or not in your account");

    const expiresAt = expires ? new Date(expires) : null;

    await prisma.warranty.create({
        data: {
            name,
            provider,
            policyNo,
            expiresAt,
            assetId,
        },
    });

    revalidatePath("/warranties");
    redirect("/warranties");
}
