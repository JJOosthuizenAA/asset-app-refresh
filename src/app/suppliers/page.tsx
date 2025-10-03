// src/app/suppliers/page.tsx
import Link from "next/link";
import { Prisma, SupplierCapabilityType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { ensureUnknownSupplier, SupplierCapabilityLabels } from "@/lib/suppliers";

import SupplierActionsCell from "./_components/SupplierActionsCell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "all", label: "All" },
] as const;

type SearchParams = {
    q?: string;
    capability?: string;
    status?: string;
    page?: string;
};

const PAGE_SIZE = 20;

function isCapability(value: string): value is SupplierCapabilityType {
    return (Object.values(SupplierCapabilityType) as string[]).includes(value);
}

function formatLocation(value: { city: string | null; region: string | null; countryCode: string | null }): string {
    const parts = [value.city, value.region, value.countryCode].filter(Boolean) as string[];
    return parts.length ? parts.join(", ") : "--";
}

export default async function SuppliersIndex({ searchParams }: { searchParams: SearchParams }) {
    const accountId = await requireAccountId();

    const q = (searchParams.q ?? "").trim();
    const rawCapability = (searchParams.capability ?? "").trim();
    const capabilityFilter = rawCapability && isCapability(rawCapability) ? rawCapability : "";
    const statusFilter = (searchParams.status ?? "active").trim() || "active";
    const page = Math.max(1, Number(searchParams.page ?? "1"));
    const skip = (page - 1) * PAGE_SIZE;

    const where: Prisma.SupplierWhereInput = { accountId };
    if (statusFilter === "active") {
        where.isActive = true;
    } else if (statusFilter === "inactive") {
        where.isActive = false;
    }
    if (capabilityFilter) {
        where.capabilities = { some: { capability: capabilityFilter } };
    }
    if (q) {
        const textMatch = { contains: q, mode: "insensitive" as const };
        where.OR = [
            { name: textMatch },
            { description: textMatch },
            { contactName: textMatch },
            { contactEmail: textMatch },
            { contactPhone: textMatch },
            { city: textMatch },
            { region: textMatch },
            { postalCode: textMatch },
        ];
    }

    const [fallbackId, total, suppliers] = await Promise.all([
        ensureUnknownSupplier(prisma, accountId),
        prisma.supplier.count({ where }),
        prisma.supplier.findMany({
            where,
            orderBy: [{ name: "asc" }],
            skip,
            take: PAGE_SIZE,
            include: { capabilities: true },
        }),
    ]);

    const capabilityOptions = Object.values(SupplierCapabilityType);
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const rangeStart = total === 0 ? 0 : skip + 1;
    const rangeEnd = Math.min(total, skip + suppliers.length);

    const baseParams = new URLSearchParams();
    if (q) baseParams.set("q", q);
    if (capabilityFilter) baseParams.set("capability", capabilityFilter);
    if (statusFilter) baseParams.set("status", statusFilter);

    const buildPageHref = (pageNumber: number) => {
        const params = new URLSearchParams(baseParams);
        if (pageNumber > 1) {
            params.set("page", String(pageNumber));
        } else {
            params.delete("page");
        }
        const query = params.toString();
        return query ? `/suppliers?${query}` : "/suppliers";
    };

    return (
        <main className="container py-8" style={{ display: "grid", gap: "1.5rem" }}>
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <div>
                    <h1>Suppliers</h1>
                    <p className="text-muted-foreground" style={{ marginTop: 4 }}>
                        Search, filter, and maintain the suppliers linked to your assets and maintenance tasks.
                    </p>
                </div>
                <Link href="/suppliers/new" className="btn btn-primary">
                    New Supplier
                </Link>
            </div>

            <section className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                    <div className="card-title">Filters</div>
                    <div className="card-description">Narrow the list by capability, status, or free-text search.</div>
                </div>
                <form className="card-content" style={{ display: "grid", gap: "1rem" }} method="get">
                    <div className="grid grid-3">
                        <label className="field">
                            <span className="label">Search</span>
                            <input type="search" name="q" defaultValue={q} placeholder="Name, contact, location..." />
                        </label>
                        <label className="field">
                            <span className="label">Capability</span>
                            <select name="capability" defaultValue={capabilityFilter}>
                                <option value="">All capabilities</option>
                                {capabilityOptions.map((capability) => (
                                    <option key={capability} value={capability}>
                                        {SupplierCapabilityLabels[capability]}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            <span className="label">Status</span>
                            <select name="status" defaultValue={statusFilter}>
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="space-x-2">
                        <button type="submit" className="btn btn-primary">
                            Apply Filters
                        </button>
                        <Link href="/suppliers" className="btn btn-outline">
                            Reset
                        </Link>
                    </div>
                </form>
            </section>

            <section className="card">
                <div className="card-header">
                    <div className="card-title">Results</div>
                    <div className="card-description">
                        Showing {rangeStart === 0 ? 0 : `${rangeStart}-${rangeEnd}`} of {total} suppliers
                    </div>
                </div>
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="supplier-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Capabilities</th>
                                    <th>Tags</th>
                                    <th>Location</th>
                                    <th>Contact</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.length ? (
                                    suppliers.map((supplier) => {
                                        const capabilityNames = supplier.capabilities.map((cap) => SupplierCapabilityLabels[cap.capability]);
                                        const isFallback = supplier.id === fallbackId;
                                        return (
                                            <tr key={supplier.id}>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                                                        <Link href={`/suppliers/${supplier.id}`}>
                                                            {supplier.name}
                                                        </Link>
                                                        {isFallback ? <span className="badge badge-outline">Fallback</span> : null}
                                                        {!supplier.isActive ? <span className="badge badge-outline">Inactive</span> : null}
                                                    </div>
                                                </td>
                                                <td>{capabilityNames.length ? capabilityNames.join(", ") : "--"}</td>
                                                <td style={{ display: "flex", gap: ".25rem", flexWrap: "wrap" }}>
                                                    {supplier.isMaintenance ? <span className="badge badge-outline">Maintenance</span> : null}
                                                    {supplier.isSales ? <span className="badge badge-outline">Sales</span> : null}
                                                </td>
                                                <td>{formatLocation(supplier)}</td>
                                                <td>
                                                    <div style={{ display: "grid", gap: 2 }}>
                                                        {supplier.contactName ? <span>{supplier.contactName}</span> : null}
                                                        {supplier.contactEmail ? (
                                                            <a href={`mailto:${supplier.contactEmail}`} className="text-xs link">
                                                                {supplier.contactEmail}
                                                            </a>
                                                        ) : null}
                                                        {supplier.contactPhone ? <span className="text-xs">{supplier.contactPhone}</span> : null}
                                                    </div>
                                                </td>
                                                <td>
                                                    <SupplierActionsCell
                                                        supplierId={supplier.id}
                                                        supplierName={supplier.name}
                                                        isFallback={isFallback}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-muted-foreground" style={{ textAlign: "center", padding: "2rem 0" }}>
                                            No suppliers match the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {pageCount > 1 ? (
                        <div className="space-x-2" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                            {page > 1 ? (
                                <Link href={buildPageHref(page - 1)} className="btn btn-outline btn-sm">
                                    Previous
                                </Link>
                            ) : (
                                <span className="btn btn-outline btn-sm" aria-disabled="true">
                                    Previous
                                </span>
                            )}
                            <span className="text-xs text-muted-foreground">Page {page} of {pageCount}</span>
                            {page < pageCount ? (
                                <Link href={buildPageHref(page + 1)} className="btn btn-outline btn-sm">
                                    Next
                                </Link>
                            ) : (
                                <span className="btn btn-outline btn-sm" aria-disabled="true">
                                    Next
                                </span>
                            )}
                        </div>
                    ) : null}
                </div>
            </section>

            <p className="text-muted-foreground" style={{ marginTop: 0 }}>
                Tip: add new suppliers before editing assets or maintenance tasks so they are available in pickers.
            </p>
        </main>
    );
}





