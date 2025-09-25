// src/app/warranties/new/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createWarrantyAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();
    const name = (formData.get("name") as string | null)?.trim();
    const provider = (formData.get("provider") as string | null)?.trim() || null;
    const policyNo = (formData.get("policyNo") as string | null)?.trim() || null;
    const expires = (formData.get("expiresAt") as string | null)?.trim() || "";
    const assetId = (formData.get("assetId") as string | null)?.trim();

    if (!name) throw new Error("Name is required.");
    if (!assetId) throw new Error("An asset is required for a warranty.");

    const asset = await prisma.asset.findFirst({
        where: { id: assetId, accountId },
        select: { id: true },
    });
    if (!asset) throw new Error("Selected asset not found for this account.");

    const expiresAt = expires ? new Date(expires) : null;

    await prisma.warranty.create({
        data: { name, provider, policyNo, expiresAt, assetId },
    });

    revalidatePath("/warranties");
    redirect("/warranties");
}

export default async function NewWarrantyPage() {
    const accountId = await requireAccountId();

    const assets = await prisma.asset.findMany({
        where: { accountId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>New Warranty</h1>
                <Link href="/warranties" className="btn btn-outline">Back</Link>
            </div>

            <form action={createWarrantyAction} className="card">
                <div className="card-header">
                    <div className="card-title">Details</div>
                </div>
                <div className="card-content">
                    <div className="grid grid-2">
                        <div className="field">
                            <label htmlFor="name" className="label">Name <span className="req">*</span></label>
                            <input id="name" name="name" type="text" required placeholder="e.g. Toyota Care" />
                        </div>
                        <div className="field">
                            <label htmlFor="assetId" className="label">Asset <span className="req">*</span></label>
                            <select id="assetId" name="assetId" required defaultValue="">
                                <option value="">— Select an asset —</option>
                                {assets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="provider" className="label">Provider</label>
                            <input id="provider" name="provider" type="text" placeholder="Provider name" />
                        </div>
                        <div className="field">
                            <label htmlFor="policyNo" className="label">Policy #</label>
                            <input id="policyNo" name="policyNo" type="text" placeholder="Policy / reference number" />
                        </div>
                        <div className="field">
                            <label htmlFor="expiresAt" className="label">Expires</label>
                            <input id="expiresAt" name="expiresAt" type="date" />
                        </div>
                        <div className="field" />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-start", gap: ".5rem", marginTop: "1rem" }}>
                        <Link href="/warranties" className="btn btn-outline">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </main>
    );
}
