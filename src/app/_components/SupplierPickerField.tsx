"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { SELF_OPTION } from "../tasks/shared";

export type SupplierCapability = string;

export type SupplierOption = {
    id: string;
    name: string;
    description?: string | null;
    isMaintenance: boolean;
    isSales: boolean;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    countryCode?: string | null;
    capabilities: SupplierCapability[];
};

interface SupplierPickerFieldProps {
    name: string;
    label?: string;
    description?: string;
    suppliers: SupplierOption[];
    value?: string | null;
    fallbackSupplierId: string;
    allowSelf?: boolean;
    selfCapabilities?: SupplierCapability[];
    capabilityOptions: SupplierCapability[];
}

type QuickCreateState = "idle" | "loading" | "success" | "error";

type QuickCreateForm = {
    name: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    isMaintenance: boolean;
    isSales: boolean;
    capabilities: SupplierCapability[];
    city: string;
    region: string;
};

const defaultQuickCreate: QuickCreateForm = {
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    isMaintenance: true,
    isSales: false,
    capabilities: [],
    city: "",
    region: "",
};

export default function SupplierPickerField({
    name,
    label = "Primary supplier",
    description,
    suppliers,
    value,
    fallbackSupplierId,
    allowSelf = false,
    selfCapabilities = [],
    capabilityOptions,
}: SupplierPickerFieldProps) {
    const initialValue = value ?? fallbackSupplierId;

    const [selectedValue, setSelectedValue] = useState(initialValue);
    const [isModalOpen, setModalOpen] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [quickForm, setQuickForm] = useState<QuickCreateForm>(defaultQuickCreate);
    const [quickState, setQuickState] = useState<QuickCreateState>("idle");
    const [quickError, setQuickError] = useState<string | null>(null);
    const [supplierList, setSupplierList] = useState<SupplierOption[]>(() => suppliers);

    const [search, setSearch] = useState("");
    const [capabilityFilter, setCapabilityFilter] = useState<SupplierCapability | "">("");
    const [maintenanceOnly, setMaintenanceOnly] = useState(false);
    const [salesOnly, setSalesOnly] = useState(false);
    const [cityFilter, setCityFilter] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setSupplierList(suppliers);
    }, [suppliers]);

    useEffect(() => {
        if (value != null) {
            setSelectedValue(value);
        }
    }, [value]);

    const filteredSuppliers = useMemo(() => {
        return supplierList.filter((supplier) => {
            if (maintenanceOnly && !supplier.isMaintenance) return false;
            if (salesOnly && !supplier.isSales) return false;
            if (capabilityFilter && !supplier.capabilities.includes(capabilityFilter)) return false;
            if (search) {
                const needle = search.toLowerCase();
                if (!supplier.name.toLowerCase().includes(needle) && !(supplier.description ?? "").toLowerCase().includes(needle)) {
                    return false;
                }
            }
            if (cityFilter) {
                const needle = cityFilter.toLowerCase();
                const cityMatch = (supplier.city ?? "").toLowerCase().includes(needle);
                const regionMatch = (supplier.region ?? "").toLowerCase().includes(needle);
                if (!cityMatch && !regionMatch) return false;
            }
            return true;
        });
    }, [supplierList, maintenanceOnly, salesOnly, capabilityFilter, search, cityFilter]);

    const selfEnabled = allowSelf && selfCapabilities.length > 0;

    function handleSelect(value: string) {
        setSelectedValue(value);
        setModalOpen(false);
    }

    async function handleQuickCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setQuickState("loading");
        setQuickError(null);

        const payload = {
            name: quickForm.name.trim(),
            contactName: quickForm.contactName.trim(),
            contactEmail: quickForm.contactEmail.trim(),
            contactPhone: quickForm.contactPhone.trim(),
            isMaintenance: quickForm.isMaintenance,
            isSales: quickForm.isSales,
            capabilities: quickForm.capabilities,
            city: quickForm.city.trim(),
            region: quickForm.region.trim(),
        };

        if (!payload.name) {
            setQuickState("error");
            setQuickError("Supplier name is required");
            return;
        }

        try {
            const res = await fetch("/api/suppliers/quick", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error ?? "Failed to create supplier");
            }

            const data = await res.json();
            const newSupplier: SupplierOption = {
                id: data.supplier.id,
                name: data.supplier.name,
                description: data.supplier.description ?? null,
                isMaintenance: data.supplier.isMaintenance,
                isSales: data.supplier.isSales,
                city: data.supplier.city ?? null,
                region: data.supplier.region ?? null,
                postalCode: data.supplier.postalCode ?? null,
                countryCode: data.supplier.countryCode ?? null,
                capabilities: data.supplier.capabilities ?? [],
            };

            setSupplierList((prev) => {
                const existing = prev.find((s) => s.id === newSupplier.id);
                const merged = existing ? prev.map((s) => (s.id === newSupplier.id ? newSupplier : s)) : [newSupplier, ...prev];
                return merged;
            });
            setQuickState("success");
            setShowQuickCreate(false);
            setQuickForm(defaultQuickCreate);
            handleSelect(newSupplier.id);
        } catch (error: any) {
            setQuickState("error");
            setQuickError(error?.message ?? "Unable to create supplier");
        }
    }

    function renderSelectedSummary() {
        if (selectedValue === SELF_OPTION) {
            return "Self (You)";
        }
        const supplier = supplierList.find((s) => s.id === selectedValue);
        if (supplier) return supplier.name;
        if (selectedValue === fallbackSupplierId) return "Unknown Supplier";
        return "Select a supplier";
    }

    return (
        <div className="field">
            <label className="label">{label}</label>
            <div className="field-inline" style={{ gap: ".5rem" }}>
                <input type="hidden" name={name} value={selectedValue} />
                <span className="text-muted-foreground">{renderSelectedSummary()}</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setModalOpen(true)}>
                    Choose
                </button>
                {selectedValue !== fallbackSupplierId && (
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setSelectedValue(fallbackSupplierId)}
                    >
                        Reset
                    </button>
                )}
            </div>
            {description ? <small className="text-xs text-muted-foreground">{description}</small> : null}

            {isModalOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Choose supplier</h2>
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => setModalOpen(false)}>
                                Close
                            </button>
                        </div>

                        <div className="modal-content" style={{ display: "grid", gap: "1rem" }}>
                            <div className="grid grid-2">
                                <label className="field">
                                    <span className="label">Search</span>
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by name or description"
                                    />
                                </label>
                                <label className="field">
                                    <span className="label">City / region</span>
                                    <input
                                        value={cityFilter}
                                        onChange={(e) => setCityFilter(e.target.value)}
                                        placeholder="Filter by location"
                                    />
                                </label>
                            </div>

                            <div className="grid grid-2">
                                <label className="field">
                                    <span className="label">Capability</span>
                                    <select value={capabilityFilter} onChange={(e) => setCapabilityFilter(e.target.value as SupplierCapability | "") }>
                                        <option value="">All capabilities</option>
                                        {capabilityOptions.map((cap) => (
                                            <option key={cap} value={cap}>
                                                {cap}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="field" style={{ display: "flex", gap: ".75rem", alignItems: "flex-end" }}>
                                    <label className="field-inline">
                                        <input type="checkbox" checked={maintenanceOnly} onChange={(e) => setMaintenanceOnly(e.target.checked)} />
                                        <span>Maintenance providers</span>
                                    </label>
                                    <label className="field-inline">
                                        <input type="checkbox" checked={salesOnly} onChange={(e) => setSalesOnly(e.target.checked)} />
                                        <span>Sales / procurement</span>
                                    </label>
                                </div>
                            </div>

                            {selfEnabled && (
                                <div className="card" style={{ background: "var(--muted)", padding: ".75rem" }}>
                                    <div className="text-sm">
                                        You have marked yourself capable of: {selfCapabilities.join(", ")}. Select
                                        <strong> Self (You)</strong> below to assign this job to yourself.
                                    </div>
                                </div>
                            )}

                            <div className="supplier-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Capabilities</th>
                                            <th>Tags</th>
                                            <th>Location</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selfEnabled && (
                                            <tr>
                                                <td>Self (You)</td>
                                                <td>{selfCapabilities.join(", ") || "--"}</td>
                                                <td>
                                                    <span className="badge badge-outline">Self-service</span>
                                                </td>
                                                <td>—</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => handleSelect(SELF_OPTION)}
                                                    >
                                                        Choose
                                                    </button>
                                                </td>
                                            </tr>
                                        )}
                                        {filteredSuppliers.map((supplier) => (
                                            <tr key={supplier.id}>
                                                <td>{supplier.name}</td>
                                                <td>{supplier.capabilities.length ? supplier.capabilities.join(", ") : "--"}</td>
                                                <td style={{ display: "flex", gap: ".25rem", flexWrap: "wrap" }}>
                                                    {supplier.isMaintenance ? <span className="badge badge-outline">Maintenance</span> : null}
                                                    {supplier.isSales ? <span className="badge badge-outline">Sales</span> : null}
                                                </td>
                                                <td>{supplier.city ?? supplier.region ?? "--"}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => handleSelect(supplier.id)}
                                                    >
                                                        Choose
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {!filteredSuppliers.length && (
                                            <tr>
                                                <td colSpan={5} className="text-muted-foreground">
                                                    No suppliers match the current filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => setShowQuickCreate((prev) => !prev)}
                                >
                                    {showQuickCreate ? "Close quick create" : "Quick-create supplier"}
                                </button>
                            </div>

                            {showQuickCreate && (
                                <form className="card" onSubmit={handleQuickCreateSubmit}>
                                    <div className="card-header">
                                        <div className="card-title">Quick create</div>
                                        <div className="card-description">Add a simple supplier without leaving this form.</div>
                                    </div>
                                    <div className="card-content" style={{ display: "grid", gap: ".75rem" }}>
                                        <label className="field">
                                            <span className="label">Name</span>
                                            <input
                                                value={quickForm.name}
                                                required
                                                onChange={(e) => setQuickForm((prev) => ({ ...prev, name: e.target.value }))}
                                                placeholder="Supplier name"
                                            />
                                        </label>
                                        <div className="grid grid-2">
                                            <label className="field">
                                                <span className="label">Contact person</span>
                                                <input
                                                    value={quickForm.contactName}
                                                    onChange={(e) => setQuickForm((prev) => ({ ...prev, contactName: e.target.value }))}
                                                    placeholder="Optional"
                                                />
                                            </label>
                                            <label className="field">
                                                <span className="label">Email</span>
                                                <input
                                                    type="email"
                                                    value={quickForm.contactEmail}
                                                    onChange={(e) => setQuickForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                                                    placeholder="Optional"
                                                />
                                            </label>
                                        </div>
                                        <label className="field">
                                            <span className="label">Phone</span>
                                            <input
                                                value={quickForm.contactPhone}
                                                onChange={(e) => setQuickForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                                                placeholder="Optional"
                                            />
                                        </label>

                                        <div className="field-inline" style={{ gap: "1rem" }}>
                                            <label className="field-inline">
                                                <input
                                                    type="checkbox"
                                                    checked={quickForm.isMaintenance}
                                                    onChange={(e) => setQuickForm((prev) => ({ ...prev, isMaintenance: e.target.checked }))}
                                                />
                                                <span>Maintenance provider</span>
                                            </label>
                                            <label className="field-inline">
                                                <input
                                                    type="checkbox"
                                                    checked={quickForm.isSales}
                                                    onChange={(e) => setQuickForm((prev) => ({ ...prev, isSales: e.target.checked }))}
                                                />
                                                <span>Sales / procurement</span>
                                            </label>
                                        </div>

                                        <label className="field">
                                            <span className="label">Capabilities</span>
                                            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                                                {capabilityOptions.map((cap) => {
                                                    const checked = quickForm.capabilities.includes(cap);
                                                    return (
                                                        <label key={`quick-cap-${cap}`} className="field-inline">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    setQuickForm((prev) => {
                                                                        const nextCaps = new Set(prev.capabilities);
                                                                        if (e.target.checked) {
                                                                            nextCaps.add(cap);
                                                                        } else {
                                                                            nextCaps.delete(cap);
                                                                        }
                                                                        return { ...prev, capabilities: Array.from(nextCaps) };
                                                                    });
                                                                }}
                                                            />
                                                            <span>{cap}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </label>

                                        <div className="grid grid-2">
                                            <label className="field">
                                                <span className="label">City</span>
                                                <input
                                                    value={quickForm.city}
                                                    onChange={(e) => setQuickForm((prev) => ({ ...prev, city: e.target.value }))}
                                                    placeholder="Optional"
                                                />
                                            </label>
                                            <label className="field">
                                                <span className="label">Region / Province</span>
                                                <input
                                                    value={quickForm.region}
                                                    onChange={(e) => setQuickForm((prev) => ({ ...prev, region: e.target.value }))}
                                                    placeholder="Optional"
                                                />
                                            </label>
                                        </div>

                                        {quickError ? (
                                            <div className="text-sm text-destructive">{quickError}</div>
                                        ) : null}

                                        <div className="field-inline" style={{ gap: ".5rem" }}>
                                            <button type="submit" className="btn btn-primary" disabled={isPending || quickState === "loading"}>
                                                {quickState === "loading" ? "Creating..." : "Create supplier"}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-outline"
                                                onClick={() => {
                                                    setQuickForm(defaultQuickCreate);
                                                    setQuickError(null);
                                                    setQuickState("idle");
                                                    setShowQuickCreate(false);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

