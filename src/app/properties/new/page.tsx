// src/app/properties/new/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { OwnershipStatus } from "@prisma/client";
import HelpPopover from "@/components/HelpPopover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createPropertyAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();
    const account = await prisma.account.findUnique({ where: { id: accountId }, select: { countryCode: true } });

    const name = (formData.get("name") as string | null)?.trim() || "";
    const label = (formData.get("label") as string | null)?.trim() || null;
    const addressLine1 = (formData.get("addressLine1") as string | null)?.trim() || null;
    const addressLine2 = (formData.get("addressLine2") as string | null)?.trim() || null;
    const city = (formData.get("city") as string | null)?.trim() || null;
    const region = (formData.get("region") as string | null)?.trim() || null;
    const postalCode = (formData.get("postalCode") as string | null)?.trim() || null;
    const countryCodeInput = (formData.get("countryCode") as string | null)?.trim() ?? "";
    let countryCode = countryCodeInput ? countryCodeInput.toUpperCase() : null;

    if (!countryCode && account?.countryCode) {
        countryCode = account.countryCode.toUpperCase();
    }

    if (!countryCode) {
        throw new Error("Set your account country before creating a property.");
    }
    const notes = (formData.get("notes") as string | null)?.trim() || null;

    if (!name) {
        throw new Error("Name is required");
    }

    const ownership = (formData.get("ownershipStatus") as string | null) || OwnershipStatus.Owner;
    const ownershipStatus = Object.values(OwnershipStatus).includes(ownership as OwnershipStatus)
        ? (ownership as OwnershipStatus)
        : OwnershipStatus.Owner;

    const purchaseDateRaw = (formData.get("purchaseDate") as string | null) || "";
    const purchaseDate = purchaseDateRaw ? new Date(purchaseDateRaw) : null;

    const purchasePriceRaw = (formData.get("purchasePrice") as string | null) || "";
    const purchasePriceNumber = purchasePriceRaw ? Number(purchasePriceRaw.replace(/[, ]/g, "")) : NaN;
    const purchasePriceCents = Number.isFinite(purchasePriceNumber) ? Math.round(purchasePriceNumber * 100) : null;

    const created = await prisma.property.create({
        data: {
            accountId,
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
        select: { id: true },
    });

    if (!account?.countryCode) {
        await prisma.account.update({ where: { id: accountId }, data: { countryCode } });
    }

    revalidatePath("/properties");
    revalidatePath(`/properties/${created.id}`);
    redirect(`/properties/${created.id}`);
}

export default async function NewPropertyPage() {
    const accountId = await requireAccountId();
    const account = await prisma.account.findUnique({ where: { id: accountId }, select: { countryCode: true } });
    const defaultCountry = account?.countryCode ? account.countryCode.toUpperCase() : "";
    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>New Property</h1>
                <Link href="/properties" className="btn btn-outline">Back</Link>
            </div>

            <form action={createPropertyAction} className="card" style={{ maxWidth: 720 }}>
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    {!defaultCountry && (
                        <div className="border rounded-lg" style={{ padding: "0.75rem", background: "#f8fafc" }}>
                            <p className="text-muted-foreground" style={{ margin: 0 }}>
                                Set your account country in <Link href="/settings/account">Account settings</Link> so new properties start in the right place.
                            </p>
                        </div>
                    )}
                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Name <span className="req">*</span></span>
                            <input name="name" required placeholder="e.g. Main Residence" />
                        </label>
                        <label className="field">
                            <span className="label">Label</span>
                            <input name="label" placeholder="Display name" />
                        </label>
                    </div>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                <span>Ownership</span>
                                <HelpPopover title="Ownership status help">
                                    Owner means you currently hold the property. Rental flags a leased property, while Sold keeps a record after it leaves your portfolio.
                                </HelpPopover>
                            </span>
                            <select name="ownershipStatus" defaultValue={OwnershipStatus.Owner}>
                                {Object.values(OwnershipStatus).map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            <span className="label">Country</span>
                            <select name="countryCode" defaultValue={defaultCountry}>
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
                            <input name="addressLine1" placeholder="Street" />
                        </label>
                        <label className="field">
                            <span className="label">Address line 2</span>
                            <input name="addressLine2" placeholder="Unit / suburb" />
                        </label>
                    </div>

                    <div className="grid grid-3">
                        <label className="field">
                            <span className="label">City</span>
                            <input name="city" />
                        </label>
                        <label className="field">
                            <span className="label">Region / State</span>
                            <input name="region" />
                        </label>
                        <label className="field">
                            <span className="label">Postal code</span>
                            <input name="postalCode" />
                        </label>
                    </div>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Purchase date</span>
                            <input type="date" name="purchaseDate" />
                        </label>
                        <label className="field">
                            <span className="label">Purchase price</span>
                            <div className="input-group">
                                <span className="prefix">Amount</span>
                                <input type="number" step="0.01" name="purchasePrice" placeholder="0.00" />
                            </div>
                        </label>
                    </div>

                    <label className="field">
                        <span className="label">Notes</span>
                        <textarea name="notes" rows={4} placeholder="Any extra context" />
                    </label>

                    <div className="space-x-2">
                        <Link href="/properties" className="btn btn-outline">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </main>
    );
}












