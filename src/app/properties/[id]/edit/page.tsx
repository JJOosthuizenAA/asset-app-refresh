// src/app/properties/[id]/edit/page.tsx
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { OwnershipStatus } from "@prisma/client";
import { dateOrDash } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function updatePropertyAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();

    const id = (formData.get("id") as string | null)?.trim() || "";
    if (!id) throw new Error("Missing property id");

    const name = (formData.get("name") as string | null)?.trim() || "";
    if (!name) throw new Error("Name is required");

    const label = (formData.get("label") as string | null)?.trim() || null;
    const addressLine1 = (formData.get("addressLine1") as string | null)?.trim() || null;
    const addressLine2 = (formData.get("addressLine2") as string | null)?.trim() || null;
    const city = (formData.get("city") as string | null)?.trim() || null;
    const region = (formData.get("region") as string | null)?.trim() || null;
    const postalCode = (formData.get("postalCode") as string | null)?.trim() || null;
    const countryCode = (formData.get("countryCode") as string | null)?.trim() || null;
    const notes = (formData.get("notes") as string | null)?.trim() || null;

    const ownership = (formData.get("ownershipStatus") as string | null) || OwnershipStatus.Owner;
    const ownershipStatus = Object.values(OwnershipStatus).includes(ownership as OwnershipStatus)
        ? (ownership as OwnershipStatus)
        : OwnershipStatus.Owner;

    const purchaseDateRaw = (formData.get("purchaseDate") as string | null) || "";
    const purchaseDate = purchaseDateRaw ? new Date(purchaseDateRaw) : null;

    const purchasePriceRaw = (formData.get("purchasePrice") as string | null) || "";
    const purchasePriceNumber = purchasePriceRaw ? Number(purchasePriceRaw.replace(/[, ]/g, "")) : NaN;
    const purchasePriceCents = Number.isFinite(purchasePriceNumber) ? Math.round(purchasePriceNumber * 100) : null;

    const existing = await prisma.property.findFirst({ where: { id, accountId }, select: { id: true } });
    if (!existing) throw new Error("Property not found or not in your account");

    await prisma.property.update({
        where: { id },
        data: {
            name,
            label,
            addressLine1,
            addressLine2,
            city,
            region,
            postalCode,
            countryCode,
            ownershipStatus,
            notes,
            purchaseDate: purchaseDate ?? undefined,
            purchasePriceCents: purchasePriceCents ?? undefined,
        },
    });

    revalidatePath(`/properties/${id}`);
    revalidatePath("/properties");
    redirect(`/properties/${id}`);
}

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
    const accountId = await requireAccountId();

    const property = await prisma.property.findFirst({
        where: { id: params.id, accountId },
        select: {
            id: true,
            name: true,
            label: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            region: true,
            postalCode: true,
            countryCode: true,
            ownershipStatus: true,
            purchaseDate: true,
            purchasePriceCents: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!property) notFound();

    const formatMoney = (cents: number | null | undefined) =>
        typeof cents === "number" ? (cents / 100).toFixed(2) : "";

    return (
        <main className="container py-8" style={{ maxWidth: 760 }}>
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1>Edit Property</h1>
                    <p className="text-muted-foreground" style={{ marginTop: 4 }}>
                        Created {dateOrDash(property.createdAt)} · Updated {dateOrDash(property.updatedAt)}
                    </p>
                </div>
                <Link href={`/properties/${property.id}`} className="btn btn-outline">Back</Link>
            </div>

            <form action={updatePropertyAction} className="card">
                <input type="hidden" name="id" value={property.id} />
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Name <span className="req">*</span></span>
                            <input name="name" defaultValue={property.name} required />
                        </label>
                        <label className="field">
                            <span className="label">Label</span>
                            <input name="label" defaultValue={property.label ?? ""} />
                        </label>
                    </div>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Ownership</span>
                            <select name="ownershipStatus" defaultValue={property.ownershipStatus}>
                                {Object.values(OwnershipStatus).map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            <span className="label">Country</span>
                            <select name="countryCode" defaultValue={property.countryCode ?? ""}>
                                <option value="">Select country</option>
                                {COUNTRY_OPTIONS.map((country) => (
                                    <option key={country.value} value={country.value}>{country.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Address line 1</span>
                            <input name="addressLine1" defaultValue={property.addressLine1 ?? ""} />
                        </label>
                        <label className="field">
                            <span className="label">Address line 2</span>
                            <input name="addressLine2" defaultValue={property.addressLine2 ?? ""} />
                        </label>
                    </div>

                    <div className="grid grid-3">
                        <label className="field">
                            <span className="label">City</span>
                            <input name="city" defaultValue={property.city ?? ""} />
                        </label>
                        <label className="field">
                            <span className="label">Region / State</span>
                            <input name="region" defaultValue={property.region ?? ""} />
                        </label>
                        <label className="field">
                            <span className="label">Postal code</span>
                            <input name="postalCode" defaultValue={property.postalCode ?? ""} />
                        </label>
                    </div>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Purchase date</span>
                            <input
                                type="date"
                                name="purchaseDate"
                                defaultValue={property.purchaseDate ? new Date(property.purchaseDate).toISOString().slice(0, 10) : ""}
                            />
                        </label>
                        <label className="field">
                            <span className="label">Purchase price</span>
                            <div className="input-group">
                                <span className="prefix">Amount</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="purchasePrice"
                                    defaultValue={formatMoney(property.purchasePriceCents)}
                                />
                            </div>
                        </label>
                    </div>

                    <label className="field">
                        <span className="label">Notes</span>
                        <textarea name="notes" rows={4} defaultValue={property.notes ?? ""} />
                    </label>

                    <div className="space-x-2">
                        <Link href={`/properties/${property.id}`} className="btn btn-outline">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </main>
    );
}








