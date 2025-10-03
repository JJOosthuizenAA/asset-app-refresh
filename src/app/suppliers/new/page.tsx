// src/app/suppliers/new/page.tsx
import Link from "next/link";
import { SupplierCapabilityType } from "@prisma/client";

import { requireAccountId } from "@/lib/current-account";
import { SupplierCapabilityLabels } from "@/lib/suppliers";

import { createSupplierAction } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewSupplierPage() {
    await requireAccountId();

    const capabilityOptions = Object.values(SupplierCapabilityType);

    return (
        <main className="container py-8" style={{ display: "grid", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <div>
                    <h1>New Supplier</h1>
                    <p className="text-muted-foreground" style={{ marginTop: 4 }}>
                        Capture supplier contact details, capabilities, and locations used across the workspace.
                    </p>
                </div>
                <Link href="/suppliers" className="btn btn-outline">
                    Back to suppliers
                </Link>
            </div>

            <section className="card">
                <div className="card-header">
                    <div className="card-title">Supplier details</div>
                    <div className="card-description">All fields are optional unless marked required.</div>
                </div>

                <form action={createSupplierAction} className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Name <span className="req">*</span></span>
                            <input name="name" placeholder="e.g. BrightSpark Electrical" required />
                        </label>
                        <label className="field">
                            <span className="label">Contact person</span>
                            <input name="contactName" placeholder="Primary contact" />
                        </label>
                    </div>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Contact email</span>
                            <input name="contactEmail" type="email" placeholder="supplier@example.com" />
                        </label>
                        <label className="field">
                            <span className="label">Contact phone</span>
                            <input name="contactPhone" placeholder="+27..." />
                        </label>
                    </div>

                    <label className="field">
                        <span className="label">Description</span>
                        <textarea name="description" rows={3} placeholder="Short summary of services"></textarea>
                    </label>

                    <div className="grid grid-3">
                        <label className="field">
                            <span className="label">Registration / reference</span>
                            <input name="registrationNumber" placeholder="Optional registration" />
                        </label>
                        <label className="field">
                            <span className="label">Service radius (km)</span>
                            <input name="serviceRadiusKm" type="number" min={0} step={1} placeholder="e.g. 50" />
                        </label>
                        <label className="field">
                            <span className="label">Active</span>
                            <div className="field-inline">
                                <input id="new-isActive" name="isActive" type="checkbox" defaultChecked />
                                <label htmlFor="new-isActive" className="text-muted-foreground" style={{ cursor: "pointer" }}>
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
                                    <input id="new-maintenance" name="isMaintenance" type="checkbox" defaultChecked />
                                    <span>Provides maintenance services</span>
                                </label>
                                <label className="field-inline">
                                    <input id="new-sales" name="isSales" type="checkbox" />
                                    <span>Provides sales / procurement</span>
                                </label>
                            </div>
                        </label>
                        <label className="field">
                            <span className="label">Capabilities</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                                {capabilityOptions.map((capability) => (
                                    <label key={capability} className="field-inline" style={{ width: "calc(50% - .25rem)" }}>
                                        <input type="checkbox" name="capabilities" value={capability} />
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
                                <input name="addressLine1" placeholder="Street" />
                            </label>
                            <label className="field">
                                <span className="label">Address line 2</span>
                                <input name="addressLine2" placeholder="Suite / unit" />
                            </label>
                        </div>
                        <div className="grid grid-3" style={{ marginTop: ".75rem" }}>
                            <label className="field">
                                <span className="label">City</span>
                                <input name="city" placeholder="City" />
                            </label>
                            <label className="field">
                                <span className="label">Region / Province</span>
                                <input name="region" placeholder="Province" />
                            </label>
                            <label className="field">
                                <span className="label">Postal code</span>
                                <input name="postalCode" placeholder="Postal code" />
                            </label>
                        </div>
                        <div className="grid grid-3" style={{ marginTop: ".75rem" }}>
                            <label className="field">
                                <span className="label">Country</span>
                                <input name="countryCode" placeholder="e.g. ZA" />
                            </label>
                            <label className="field">
                                <span className="label">Latitude</span>
                                <input name="latitude" type="number" step="0.000001" placeholder="Optional" />
                            </label>
                            <label className="field">
                                <span className="label">Longitude</span>
                                <input name="longitude" type="number" step="0.000001" placeholder="Optional" />
                            </label>
                        </div>
                    </fieldset>

                    <label className="field">
                        <span className="label">Internal notes</span>
                        <textarea name="notes" rows={3} placeholder="Notes visible to your team"></textarea>
                    </label>

                    <div className="space-x-2">
                        <Link href="/suppliers" className="btn btn-outline">
                            Cancel
                        </Link>
                        <button type="submit" className="btn btn-primary">
                            Create Supplier
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}

