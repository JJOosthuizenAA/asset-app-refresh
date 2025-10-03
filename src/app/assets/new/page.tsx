// src/app/assets/new/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureUnknownSupplier } from "@/lib/suppliers";
import { requireAccountId } from "@/lib/current-account";
import { isAssetTypeAllowed } from "@/lib/asset-types";
import SupplierPickerField from "@/app/_components/SupplierPickerField";
import { SupplierCapabilityType } from "@prisma/client";
import { listParentsByType, loadParentSummary, parseParentRef } from "@/lib/parents";
import ParentAndTypeFields from "./ParentAndTypeFields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asString(value: FormDataEntryValue | null): string | null {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
}

async function createAssetAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();
    const fallbackSupplierId = await ensureUnknownSupplier(prisma, accountId);

    const name = (formData.get("name") as string)?.trim();
    if (!name) throw new Error("Asset name is required");
    const description = (formData.get("description") as string | null)?.trim() || null;
    const assetType = (formData.get("assetType") as string | null) || null;
    const serial = (formData.get("serial") as string | null)?.trim() || null;
    const location = (formData.get("location") as string | null)?.trim() || null;

    const priceRaw = (formData.get("purchasePrice") as string | null) ?? "";
    const purchasePriceCents = priceRaw.trim() === ""
        ? null
        : Math.round(Number(priceRaw.replace(/[, ]/g, "")) * 100);

    const purchaseDateStr = (formData.get("purchaseDate") as string | null) || "";
    const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;

    const parentRef = parseParentRef(formData);
    if (!parentRef) {
        throw new Error("Parent selection is required");
    }

    const parent = await loadParentSummary(prisma, accountId, parentRef);
    if (!parent) {
        throw new Error("Parent not found or not in your account");
    }

    if (!assetType || !isAssetTypeAllowed(parent.type, assetType)) {
        throw new Error(`Asset type "${assetType ?? ""}" not allowed for ${parent.type}`);
    }

    let primarySupplierId = fallbackSupplierId;
    const supplierRaw = asString(formData.get("primarySupplierId"));
    if (supplierRaw) {
        const supplier = await prisma.supplier.findFirst({
            where: { id: supplierRaw, accountId },
            select: { id: true },
        });
        if (!supplier) {
            throw new Error("Selected supplier not found for this account");
        }
        primarySupplierId = supplier.id;
    }

    await prisma.asset.create({
        data: {
            accountId,
            parentType: parent.type,
            parentId: parent.id,
            name,
            description,
            assetType: assetType as any,
            category: assetType ?? null,
            serial,
            location,
            purchaseDate,
            purchasePriceCents,
            primarySupplierId,
        },
    });

    revalidatePath("/assets");
    redirect("/assets");
}

export default async function NewAssetPage() {
    const accountId = await requireAccountId();

    const [account, parentsByType, fallbackSupplierId, suppliers] = await Promise.all([
        prisma.account.findUnique({
            where: { id: accountId },
            select: { currencyCode: true },
        }),
        listParentsByType(prisma, accountId),
        ensureUnknownSupplier(prisma, accountId),
        prisma.supplier.findMany({
            where: { accountId },
            select: {
                id: true,
                name: true,
                description: true,
                isMaintenance: true,
                isSales: true,
                city: true,
                region: true,
                postalCode: true,
                countryCode: true,
                capabilities: { select: { capability: true } },
            },
            orderBy: { name: "asc" },
        }),
    ]);

    const currency = account?.currencyCode ?? "ZAR";
    const totalParents = Object.values(parentsByType).reduce((count, list) => count + list.length, 0);

    const supplierOptions = [
        {
            id: fallbackSupplierId,
            name: "Unknown Supplier",
            description: null,
            isMaintenance: false,
            isSales: false,
            city: null,
            region: null,
            postalCode: null,
            countryCode: null,
            capabilities: [],
        },
        ...suppliers
            .filter((supplier) => supplier.id !== fallbackSupplierId)
            .map((supplier) => ({
                id: supplier.id,
                name: supplier.name,
                description: supplier.description ?? null,
                isMaintenance: supplier.isMaintenance,
                isSales: supplier.isSales,
                city: supplier.city ?? null,
                region: supplier.region ?? null,
                postalCode: supplier.postalCode ?? null,
                countryCode: supplier.countryCode ?? null,
                capabilities: supplier.capabilities.map((cap) => cap.capability),
            }))
    ];

    const capabilityOptions = Object.values(SupplierCapabilityType);

    return (
        <main className="container py-8">
            <h1>New Asset</h1>

            {totalParents === 0 ? (
                <section className="card" style={{ marginTop: "1rem", maxWidth: 640 }}>
                    <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                        <p className="text-muted-foreground">
                            You need a property, vehicle, personal, or other container before you can add an asset.
                        </p>
                        <div className="space-x-2">
                            <Link href="/properties" className="btn btn-outline">View Properties</Link>
                            <Link href="/vehicles" className="btn btn-outline">View Vehicles</Link>
                            <Link href="/personal" className="btn btn-outline">View Personal Containers</Link>
                            <Link href="/other" className="btn btn-outline">View Other Containers</Link>
                        </div>
                    </div>
                </section>
            ) : (
                <form action={createAssetAction} className="card" style={{ maxWidth: 640, marginTop: "1rem" }}>
                    <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                        <ParentAndTypeFields parents={parentsByType} />

                        <div className="field">
                            <label htmlFor="name" className="label">Asset name <span className="req">*</span></label>
                            <input id="name" name="name" type="text" required />
                        </div>

                        <SupplierPickerField
                            name="primarySupplierId"
                            label="Primary supplier"
                            description="Supply the default vendor for this asset. Can't find them? Add a supplier and refresh."
                            suppliers={supplierOptions}
                            value={fallbackSupplierId}
                            fallbackSupplierId={fallbackSupplierId}
                            allowSelf={false}
                            selfCapabilities={[]}
                            capabilityOptions={capabilityOptions}
                        />

                        <div className="grid grid-2">
                            <div className="field">
                                <label htmlFor="serial" className="label">Serial / VIN</label>
                                <input id="serial" name="serial" type="text" />
                            </div>
                            <div className="field">
                                <label htmlFor="location" className="label">Location</label>
                                <input id="location" name="location" type="text" />
                            </div>
                        </div>

                        <div className="grid grid-2">
                            <div className="field">
                                <label htmlFor="purchaseDate" className="label">Purchase date</label>
                                <input id="purchaseDate" name="purchaseDate" type="date" />
                            </div>
                            <div className="field">
                                <label className="label" htmlFor="purchasePrice">Purchase price</label>
                                <div className="input-group">
                                    <span className="prefix">{currency}</span>
                                    <input id="purchasePrice" name="purchasePrice" type="number" step="0.01" className="text-right" />
                                </div>
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="description" className="label">Description</label>
                            <textarea id="description" name="description" rows={3} />
                        </div>

                        <div className="space-x-2">
                            <Link href="/assets" className="btn btn-outline">Cancel</Link>
                            <button type="submit" className="btn btn-primary">Save</button>
                        </div>
                    </div>
                </form>
            )}
        </main>
    );
}
