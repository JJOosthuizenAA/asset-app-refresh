// src/app/suppliers/[id]/edit/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { SupplierCapabilityType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { ensureUnknownSupplier, SupplierCapabilityLabels } from "@/lib/suppliers";

import { updateSupplierAction } from "../../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditSupplierPage({ params }: { params: { id: string } }) {
    const accountId = await requireAccountId();

    const supplier = await prisma.supplier.findFirst({
        where: { id: params.id, accountId },
        include: {
            capabilities: true,
        },
    });

    if (!supplier) {
        notFound();
    }

    const capabilityOptions = Object.values(SupplierCapabilityType);
    const selectedCapabilities = new Set(supplier.capabilities.map((cap) => cap.capability));
    const fallbackId = await ensureUnknownSupplier(prisma, accountId);
    const statusLabels: string[] = [supplier.isActive ? "Active" : "Inactive"];
    if (supplier.id === fallbackId) {
        statusLabels.push("Fallback");
    }
    const tagLabels: string[] = [];
    if (supplier.isMaintenance) {
        tagLabels.push("Maintenance");
    }
    if (supplier.isSales) {
        tagLabels.push("Sales");
    }

    return (
        <main className="container py-8" style={{ display: "grid", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <div>
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <h1>Edit {supplier.name}</h1>
                    <p className="text-muted-foreground" style={{ marginTop: 4 }}>
                        Update supplier information, capabilities, and address details.
                    </p>
                </div>
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Link href={`/suppliers/${supplier.id}`} className="btn btn-outline">
                        Cancel
                    </Link>
                    <Link href="/suppliers" className="btn btn-outline">
                        Back to list
                    </Link>
                </div>
            </div>

            <section className="card">
                <div className="card-header">
                    <div className="card-title">Current summary</div>
                    <div className="card-description">Review key status indicators before editing.</div>
                </div>
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="grid grid-2">
                        <div className="field">
                            <span className="label">Status</span>
                            <div className="text-sm" style={{ display: "grid", gap: 2 }}>
                                {statusLabels.map((label) => (
                                    <span key={label}>{label}</span>
                                ))}
                            </div>
                        </div>
                        <div className="field">
                            <span className="label">Capabilities selected</span>
                            <span>{selectedCapabilities.size ? `${selectedCapabilities.size} capability${selectedCapabilities.size === 1 ? "" : "ies"}` : "None"}</span>
                        </div>
                    </div>
                    <div className="grid grid-2">
                        <div className="field">
                            <span className="label">Flags</span>
                            {tagLabels.length ? (
                                <div className="text-sm" style={{ display: "grid", gap: 2 }}>
                                    {tagLabels.map((label) => (
                                        <span key={label}>{label}</span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-muted-foreground">None</span>
                            )}
                        </div>
                        <div className="field">
                            <span className="label">Service radius</span>
                            <span>{typeof supplier.serviceRadiusKm === "number" ? `${supplier.serviceRadiusKm} km` : "--"}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card">
                <div className="card-header">
                    <div className="card-title">Edit supplier</div>
                    <div className="card-description">All fields are optional unless marked required.</div>
                </div>
                <form action={updateSupplierAction} className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <input type="hidden" name="supplierId" value={supplier.id} />

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Name <span className="req">*</span></span>
                            <input name="name" defaultValue={supplier.name} required />
                        </label>
                        <label className="field">
                            <span className="label">Contact person</span>
                            <input name="contactName" defaultValue={supplier.contactName ?? ""} />
                        </label>
                    </div>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Contact email</span>
                            <input name="contactEmail" type="email" defaultValue={supplier.contactEmail ?? ""} />
                        </label>
                        <label className="field">
                            <span className="label">Contact phone</span>
                            <input name="contactPhone" defaultValue={supplier.contactPhone ?? ""} />
                        </label>
                    </div>

                    <label className="field">
                        <span className="label">Description</span>
                        <textarea name="description" rows={3} defaultValue={supplier.description ?? ""}></textarea>
                    </label>

                    <div className="grid grid-3">
                        <label className="field">
                            <span className="label">Registration / reference</span>
                            <input name="registrationNumber" defaultValue={supplier.registrationNumber ?? ""} />
                        </label>
                        <label className="field">
                            <span className="label">Service radius (km)</span>
                            <input name="serviceRadiusKm" type="number" min={0} step={1} defaultValue={
                                supplier.serviceRadiusKm ?? ""
                            } />
                        </label>
                        <label className="field">
                            <span className="label">Active</span>
                            <div className="field-inline">
                                <input
                                    id="edit-isActive"
                                    name="isActive"
                                    type="checkbox"
                                    defaultChecked={supplier.isActive}
                                />
                                <label htmlFor="edit-isActive" className="text-muted-foreground" style={{ cursor: "pointer" }}>
                                    Supplier is active
                                </label>
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Flags</span>
                            <div style={{ display: "grid", gap: ".5rem" }}>
                                <label className="field-inline">
                                    <input
                                        id="edit-maintenance"
                                        name="isMaintenance"
                                        type="checkbox"
                                        defaultChecked={supplier.isMaintenance}
                                    />
                                    <span>Provides maintenance services</span>
                                </label>
                                <label className="field-inline">
                                    <input id="edit-sales" name="isSales" type="checkbox" defaultChecked={supplier.isSales} />
                                    <span>Provides sales / procurement</span>
                                </label>
                            </div>
                        </label>
                        <label className="field">
                            <span className="label">Capabilities</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                                {capabilityOptions.map((capability) => (
                                    <label key={capability} className="field-inline" style={{ width: "calc(50% - .25rem)" }}>
                                        <input
                                            type="checkbox"
                                            name="capabilities"
                                            value={capability}
                                            defaultChecked={selectedCapabilities.has(capability)}
                                        />
                                        <span>{SupplierCapabilityLabels[capability]}</span>
                                    </label>
                                ))}
                            </div>
                        </label>
                    </div>

                    <fieldset className="field" style={{ border: "1px solid var(--border)", padding: ".75rem", borderRadius: "var(--radius)" }}>
                        <legend className="label">Address</legend>
                        <div className="grid grid-2">
                            <label className="field">
                                <span className="label">Address line 1</span>
                                <input name="addressLine1" defaultValue={supplier.addressLine1 ?? ""} />
                            </label>
                            <label className="field">
                                <span className="label">Address line 2</span>
                                <input name="addressLine2" defaultValue={supplier.addressLine2 ?? ""} />
                            </label>
                        </div>
                        <div className="grid grid-3" style={{ marginTop: ".75rem" }}>
                            <label className="field">
                                <span className="label">City</span>
                                <input name="city" defaultValue={supplier.city ?? ""} />
                            </label>
                            <label className="field">
                                <span className="label">Region / Province</span>
                                <input name="region" defaultValue={supplier.region ?? ""} />
                            </label>
                            <label className="field">
                                <span className="label">Postal code</span>
                                <input name="postalCode" defaultValue={supplier.postalCode ?? ""} />
                            </label>
                        </div>
                        <div className="grid grid-3" style={{ marginTop: ".75rem" }}>
                            <label className="field">
                                <span className="label">Country</span>
                                <input name="countryCode" defaultValue={supplier.countryCode ?? ""} />
                            </label>
                            <label className="field">
                                <span className="label">Latitude</span>
                                <input name="latitude" type="number" step="0.000001" defaultValue={
                                    supplier.latitude ?? ""
                                } />
                            </label>
                            <label className="field">
                                <span className="label">Longitude</span>
                                <input name="longitude" type="number" step="0.000001" defaultValue={
                                    supplier.longitude ?? ""
                                } />
                            </label>
                        </div>
                    </fieldset>

                    <label className="field">
                        <span className="label">Internal notes</span>
                        <textarea name="notes" rows={3} defaultValue={supplier.notes ?? ""}></textarea>
                    </label>

                    <div className="space-x-2">
                        <Link href={`/suppliers/${supplier.id}`} className="btn btn-outline">
                            Discard changes
                        </Link>
                        <button type="submit" className="btn btn-primary">
                            Save Supplier
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}
