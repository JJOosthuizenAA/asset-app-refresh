// src/app/suppliers/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { ensureUnknownSupplier, SupplierCapabilityLabels } from "@/lib/suppliers";

import { deleteSupplierAction } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatLocation(value: { city: string | null; region: string | null; countryCode: string | null }) {
    const parts = [value.city, value.region, value.countryCode].filter(Boolean) as string[];
    return parts.length ? parts.join(", ") : "--";
}

function formatAddress(value: {
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string | null;
}) {
    const lines = [value.addressLine1, value.addressLine2];
    const locality = [value.city, value.region, value.postalCode].filter(Boolean).join(", ");
    if (locality) {
        lines.push(locality);
    }
    if (value.countryCode) {
        lines.push(value.countryCode);
    }
    const filtered = lines.filter((line) => typeof line === "string" && line.trim().length > 0) as string[];
    return filtered.length ? filtered : ["--"];
}

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
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

    const fallbackId = await ensureUnknownSupplier(prisma, accountId);
    const capabilityDisplay = supplier.capabilities.map((capability) => SupplierCapabilityLabels[capability.capability]);
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
    if (capabilityDisplay.length) {
        tagLabels.push(`${capabilityDisplay.length} ${capabilityDisplay.length === 1 ? "capability" : "capabilities"}`);
    }
    const addressLines = formatAddress(supplier);

    return (
        <main className="container py-8" style={{ display: "grid", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <div>
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <h1>{supplier.name}</h1>
                    <p className="text-muted-foreground" style={{ marginTop: 4 }}>
                        Review supplier details before editing or linking them to assets and maintenance tasks.
                    </p>
                </div>
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Link href={`/suppliers/${supplier.id}/edit`} className="btn btn-outline">
                        Edit
                    </Link>
                    <Link href="/suppliers" className="btn btn-outline">
                        Back
                    </Link>
                </div>
            </div>

            <section className="card">
                <div className="card-header">
                    <div className="card-title">Overview</div>
                    <div className="card-description">Quick reference for status and operating context.</div>
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
                            <span className="label">Tags</span>
                            {tagLabels.length ? (
                                <div className="text-sm" style={{ display: "grid", gap: 2 }}>
                                    {tagLabels.map((label) => (
                                        <span key={label}>{label}</span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-muted-foreground">--</span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-2">
                        <div className="field">
                            <span className="label">Capabilities</span>
                            {capabilityDisplay.length ? (
                                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                                    {capabilityDisplay.map((label) => (
                                        <li key={label}>{label}</li>
                                    ))}
                                </ul>
                            ) : (
                                <span className="text-muted-foreground">No capabilities recorded</span>
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
                    <div className="card-title">Contact & Location</div>
                    <div className="card-description">Reach out and understand where services originate.</div>
                </div>
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="grid grid-2">
                        <div className="field">
                            <span className="label">Primary contact</span>
                            <div className="text-sm" style={{ display: "grid", gap: 4 }}>
                                {supplier.contactName ? <span>{supplier.contactName}</span> : null}
                                {supplier.contactEmail ? (
                                    <a href={`mailto:${supplier.contactEmail}`} className="link">
                                        {supplier.contactEmail}
                                    </a>
                                ) : null}
                                {supplier.contactPhone ? <span>{supplier.contactPhone}</span> : null}
                                {!supplier.contactName && !supplier.contactEmail && !supplier.contactPhone ? (
                                    <span className="text-muted-foreground">No contact information captured</span>
                                ) : null}
                            </div>
                        </div>
                        <div className="field">
                            <span className="label">Registration number</span>
                            <span>{supplier.registrationNumber || "--"}</span>
                        </div>
                    </div>
                    <div className="grid grid-2">
                        <div className="field">
                            <span className="label">Location</span>
                            <span>{formatLocation(supplier)}</span>
                        </div>
                        <div className="field">
                            <span className="label">Address</span>
                            <div className="text-sm" style={{ display: "grid", gap: 2 }}>
                                {addressLines.map((line, index) => (
                                    <span key={`${line}-${index}`}>{line}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-2">
                        <div className="field">
                            <span className="label">Latitude</span>
                            <span>{typeof supplier.latitude === "number" ? supplier.latitude : "--"}</span>
                        </div>
                        <div className="field">
                            <span className="label">Longitude</span>
                            <span>{typeof supplier.longitude === "number" ? supplier.longitude : "--"}</span>
                        </div>
                    </div>
                </div>
            </section>

            {supplier.description ? (
                <section className="card">
                    <div className="card-header">
                        <div className="card-title">Description</div>
                    </div>
                    <div className="card-content">
                        <p style={{ whiteSpace: "pre-wrap" }}>{supplier.description}</p>
                    </div>
                </section>
            ) : null}

            {supplier.notes ? (
                <section className="card">
                    <div className="card-header">
                        <div className="card-title">Internal notes</div>
                    </div>
                    <div className="card-content">
                        <p style={{ whiteSpace: "pre-wrap" }}>{supplier.notes}</p>
                    </div>
                </section>
            ) : null}

            <section className="card" style={{ borderColor: "var(--destructive)" }}>
                <div className="card-header">
                    <div className="card-title" style={{ color: "var(--destructive)" }}>
                        Danger zone
                    </div>
                    <div className="card-description">
                        Remove this supplier. Assets and tasks relying on it will fall back to the default supplier.
                    </div>
                </div>
                <div className="card-content">
                    <form action={deleteSupplierAction} style={{ display: "inline-flex", gap: ".5rem", alignItems: "center" }}>
                        <input type="hidden" name="supplierId" value={supplier.id} />
                        <button
                            type="submit"
                            className="btn btn-danger"
                            disabled={supplier.id === fallbackId}
                            title={supplier.id === fallbackId ? "Fallback supplier cannot be deleted" : "Delete supplier"}
                        >
                            Delete Supplier
                        </button>
                        {supplier.id === fallbackId ? (
                            <span className="text-xs text-muted-foreground">
                                The fallback supplier is required and cannot be removed.
                            </span>
                        ) : null}
                    </form>
                </div>
            </section>
        </main>
    );
}
