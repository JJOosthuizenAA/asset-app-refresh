// src/app/assets/[id]/edit/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureUnknownSupplier } from "@/lib/suppliers";
import SupplierPickerField from "@/app/_components/SupplierPickerField";
import { SupplierCapabilityType } from "@prisma/client";
import { requireAccountId } from "@/lib/current-account";
import { allowedAssetTypesFor, isAssetTypeAllowed } from "@/lib/asset-types";
import { loadParentSummary, ParentTypeLabels } from "@/lib/parents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asString(value: FormDataEntryValue | null): string | null {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
}

function formatDate(value: Date | null | undefined) {
    if (!value) return "--";
    return value.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function updateAssetAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("Asset name is required");
    const description = (formData.get("description") as string | null)?.trim() || null;
    const assetType = (formData.get("assetType") as string | null) || null;
    const serial = (formData.get("serial") as string | null)?.trim() || null;
    const location = (formData.get("location") as string | null)?.trim() || null;

    const priceRaw = (formData.get("purchasePrice") as string | null) ?? "";
    const purchasePriceCents =
        priceRaw.trim() === "" ? null : Math.round(Number(priceRaw.replace(/[, ]/g, "")) * 100);

    const purchaseDateStr = (formData.get("purchaseDate") as string | null) || "";
    const purchaseDate = purchaseDateStr ? new Date(purchaseDateStr) : null;

    const supplierRaw = asString(formData.get("primarySupplierId"));
    const fallbackSupplierId = await ensureUnknownSupplier(prisma, accountId);
    let primarySupplierId = fallbackSupplierId;
    if (supplierRaw) {
        const supplier = await prisma.supplier.findFirst({
            where: { id: supplierRaw, accountId },
            select: { id: true },
        });
        if (!supplier) {
            throw new Error("Selected supplier not found in this account");
        }
        primarySupplierId = supplier.id;
    }

    const ctx = await prisma.asset.findFirst({
        where: { id, accountId },
        select: {
            id: true,
            parentType: true,
        },
    });

    if (!ctx) throw new Error("Asset not found or not in this account");

    if (!assetType || !isAssetTypeAllowed(ctx.parentType, assetType)) {
        throw new Error(`Asset type "${assetType ?? ""}" not allowed for ${ctx.parentType}`);
    }

    await prisma.asset.update({
        where: { id },
        data: {
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

    revalidatePath(`/assets/${id}`);
    redirect(`/assets/${id}`);
}

export default async function EditAssetPage({ params }: { params: { id: string } }) {
    const accountId = await requireAccountId();

    const asset = await prisma.asset.findFirst({
        where: { id: params.id, accountId },
        select: {
            id: true,
            name: true,
            description: true,
            assetType: true,
            category: true,
            serial: true,
            location: true,
            purchaseDate: true,
            purchasePriceCents: true,
            parentType: true,
            parentId: true,
            primarySupplierId: true,
            account: { select: { currencyCode: true } },
        },
    });

    if (!asset) return notFound();

    const account = asset.account;
    const currency = account?.currencyCode ?? "ZAR";

    const allowedOptions = allowedAssetTypesFor(asset.parentType);
    const currentType = asset.assetType ?? "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [parent, fallbackSupplierId, supplierOptions, activeWarranties, openMaintenance] = await Promise.all([
        loadParentSummary(prisma, accountId, { type: asset.parentType, id: asset.parentId }),
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
                capabilities: {
                    select: { capability: true },
                },
            },
            orderBy: { name: "asc" },
        }),
        prisma.warranty.findMany({
            where: {
                assetId: asset.id,
                OR: [{ expiresAt: null }, { expiresAt: { gte: today } }],
            },
            orderBy: { expiresAt: "asc" },
            select: {
                id: true,
                name: true,
                expiresAt: true,
            },
        }),
        prisma.maintenanceTask.findMany({
            where: {
                assetId: asset.id,
                completed: false,
                cancelledAt: null,
            },
            orderBy: [
                { dueDate: "asc" },
                { nextDueDate: "asc" },
                { createdAt: "asc" },
            ],
            select: {
                id: true,
                title: true,
                dueDate: true,
                nextDueDate: true,
                isRecurring: true,
            },
        }),
    ]);


const supplierList = [
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
    ...supplierOptions
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
        })),
];
const supplierDefault = asset.primarySupplierId ?? fallbackSupplierId;

const capabilityOptions = Object.values(SupplierCapabilityType);

    return (
        <main className="container py-8">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>Edit Asset</h1>
                <Link href={`/assets/${asset.id}`} className="btn btn-outline">Back to asset</Link>
            </div>

            <section className="card" style={{ marginTop: "1rem" }}>
                <div className="card-header">
                    <div className="card-title">Current coverage & maintenance</div>
                    <div className="card-description">Use this while updating the asset details.</div>
                </div>
                <div className="card-content" style={{ display: "grid", gap: "0.75rem" }}>
                    <div>
                        <div className="text-muted-foreground text-xs" style={{ marginBottom: ".25rem" }}>Active warranties</div>
                        {activeWarranties.length ? (
                            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                                {activeWarranties.map((warranty) => (
                                    <li key={warranty.id}>
                                        <Link href={`/warranties/${warranty.id}`}>{warranty.name}</Link>
                                        <span className="text-muted-foreground">{` (expires ${formatDate(warranty.expiresAt)})`}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-muted-foreground">No active warranties</div>
                        )}
                    </div>

                    <div>
                        <div className="text-muted-foreground text-xs" style={{ marginBottom: ".25rem" }}>Open maintenance items</div>
                        {openMaintenance.length ? (
                            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                                {openMaintenance.map((task) => (
                                    <li key={task.id}>
                                        <Link href={`/tasks/${task.id}`}>{task.title}</Link>
                                        <span className="text-muted-foreground">
                                            {task.dueDate ? ` • due ${formatDate(task.dueDate)}` : task.isRecurring && task.nextDueDate ? ` • next ${formatDate(task.nextDueDate)}` : ""}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-muted-foreground">No open maintenance tasks</div>
                        )}
                    </div>
                </div>
            </section>

            <form action={updateAssetAction} className="card" style={{ maxWidth: 640, marginTop: "1rem" }}>
                <input type="hidden" name="id" value={asset.id} />

                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="field">
                        <div className="text-xs text-muted-foreground">Container</div>
                        <div className="font-medium">{parent?.label ?? "--"}</div>
                        <small className="text-xs">Type: {ParentTypeLabels[asset.parentType]}</small>
                    </div>

                    <div className="field">
                        <label htmlFor="name" className="label">Asset name <span className="req">*</span></label>
                        <input id="name" name="name" type="text" required defaultValue={asset.name} />
                    </div>

                    <SupplierPickerField
                        name="primarySupplierId"
                        label="Primary supplier"
                        description="Choose who owns this asset. Can't find them? Add a supplier and reload."
                        suppliers={supplierList}
                        value={supplierDefault}
                        fallbackSupplierId={fallbackSupplierId}
                        allowSelf={false}
                        selfCapabilities={[]}
                        capabilityOptions={capabilityOptions}
                    />

                    <div className="field">
                        <label htmlFor="assetType" className="label">Asset type <span className="req">*</span></label>
                        <select id="assetType" name="assetType" required defaultValue={currentType}>
                            <option value="" disabled>Select a type</option>
                            {allowedOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                        <small className="text-xs text-muted-foreground">
                            Allowed for {ParentTypeLabels[asset.parentType]} containers.
                        </small>
                    </div>
                    <div className="grid grid-2">
                        <div className="field">
                            <label htmlFor="serial" className="label">Serial / VIN</label>
                            <input id="serial" name="serial" type="text" defaultValue={asset.serial ?? ""} />
                        </div>
                        <div className="field">
                            <label htmlFor="location" className="label">Location</label>
                            <input id="location" name="location" type="text" defaultValue={asset.location ?? ""} />
                        </div>
                    </div>

                    <div className="grid grid-2">
                        <div className="field">
                            <label htmlFor="purchaseDate" className="label">Purchase date</label>
                            <input
                                id="purchaseDate"
                                name="purchaseDate"
                                type="date"
                                defaultValue={asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().slice(0, 10) : ""}
                            />
                        </div>
                        <div className="field">
                            <label className="label" htmlFor="purchasePrice">Purchase price</label>
                            <div className="input-group">
                                <span className="prefix">{currency}</span>
                                <input
                                    id="purchasePrice"
                                    name="purchasePrice"
                                    type="number"
                                    step="0.01"
                                    className="text-right"
                                    defaultValue={
                                        asset.purchasePriceCents != null
                                            ? (asset.purchasePriceCents / 100).toFixed(2)
                                            : ""
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="field">
                        <label htmlFor="description" className="label">Description</label>
                        <textarea id="description" name="description" rows={3} defaultValue={asset.description ?? ""} />
                    </div>

                    <div className="space-x-2">
                        <Link href={`/assets/${asset.id}`} className="btn btn-outline">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </main>
    );
}


