// src/app/warranties/[id]/edit/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function updateWarrantyAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();
    const id = (formData.get("id") as string | null)?.trim();
    const name = (formData.get("name") as string | null)?.trim();
    const provider = (formData.get("provider") as string | null)?.trim() || null;
    const policyNo = (formData.get("policyNo") as string | null)?.trim() || null;
    const expires = (formData.get("expiresAt") as string | null)?.trim() || "";
    const assetId = (formData.get("assetId") as string | null)?.trim();

    if (!id) throw new Error("Missing warranty id");
    if (!name) throw new Error("Name is required");
    if (!assetId) throw new Error("Asset is required");

    const warranty = await prisma.warranty.findFirst({
        where: { id, asset: { accountId } },
        select: { id: true },
    });
    if (!warranty) throw new Error("Warranty not found or not in your account");

    const asset = await prisma.asset.findFirst({
        where: { id: assetId, accountId },
        select: { id: true },
    });
    if (!asset) throw new Error("Asset not found or not in your account");

    const expiresAt = expires ? new Date(expires) : null;

    await prisma.warranty.update({
        where: { id },
        data: { name, provider, policyNo, expiresAt, assetId },
    });

    revalidatePath("/warranties");
    revalidatePath(`/warranties/${id}`);
    redirect(`/warranties/${id}`);
}

export default async function EditWarrantyPage({ params }: { params: { id: string } }) {
    const accountId = await requireAccountId();

    const warranty = await prisma.warranty.findFirst({
        where: { id: params.id, asset: { accountId } },
        select: {
            id: true,
            name: true,
            provider: true,
            policyNo: true,
            expiresAt: true,
            asset: { select: { id: true, name: true } },
        },
    });

    if (!warranty || !warranty.asset) notFound();

    const assets = await prisma.asset.findMany({
        where: { accountId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    const formatDate = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : "");

    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>Edit Warranty</h1>
                <Link href={`/warranties/${warranty.id}`} className="btn btn-outline">Back</Link>
            </div>

            <form action={updateWarrantyAction} className="card">
                <input type="hidden" name="id" value={warranty.id} />
                <div className="card-header">
                    <div className="card-title">Details</div>
                </div>
                <div className="card-content">
                    <div className="grid grid-2">
                        <div className="field">
                            <label htmlFor="name" className="label">Name <span className="req">*</span></label>
                            <input id="name" name="name" type="text" required defaultValue={warranty.name} />
                        </div>
                        <div className="field">
                            <label htmlFor="assetId" className="label">Asset <span className="req">*</span></label>
                            <select id="assetId" name="assetId" required defaultValue={warranty.asset.id}>
                                {assets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="provider" className="label">Provider</label>
                            <input id="provider" name="provider" type="text" defaultValue={warranty.provider ?? ""} />
                        </div>
                        <div className="field">
                            <label htmlFor="policyNo" className="label">Policy #</label>
                            <input id="policyNo" name="policyNo" type="text" defaultValue={warranty.policyNo ?? ""} />
                        </div>
                        <div className="field">
                            <label htmlFor="expiresAt" className="label">Expires</label>
                            <input id="expiresAt" name="expiresAt" type="date" defaultValue={formatDate(warranty.expiresAt)} />
                        </div>
                        <div className="field" />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-start", gap: ".5rem", marginTop: "1rem" }}>
                        <Link href={`/warranties/${warranty.id}`} className="btn btn-outline">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </main>
    );
}
