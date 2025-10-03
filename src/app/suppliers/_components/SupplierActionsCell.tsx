"use client";

import Link from "next/link";
import { useCallback } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { deleteSupplierAction } from "../actions";

type SupplierActionsCellProps = {
    supplierId: string;
    supplierName: string;
    isFallback: boolean;
};

export default function SupplierActionsCell({ supplierId, supplierName, isFallback }: SupplierActionsCellProps) {
    const handleSubmit = useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            if (isFallback) return;
            const confirmed = window.confirm(
                `Delete "${supplierName}"? This cannot be undone and linked assets will switch to the fallback supplier.`,
            );
            if (!confirmed) {
                event.preventDefault();
            }
        },
        [supplierName, isFallback],
    );

    return (
        <div className="actions-flex assets">
            <span className="action-slot">
                <Link
                    href={`/suppliers/${supplierId}`}
                    className="btn btn-outline btn-icon"
                    aria-label="View supplier"
                    title="View supplier"
                >
                    <Eye size={16} aria-hidden="true" />
                </Link>
            </span>
            <span className="action-slot">
                <Link
                    href={`/suppliers/${supplierId}/edit`}
                    className="btn btn-outline btn-icon"
                    aria-label="Edit supplier"
                    title="Edit supplier"
                >
                    <Pencil size={16} aria-hidden="true" />
                </Link>
            </span>
            <form action={deleteSupplierAction} className="action-slot" onSubmit={handleSubmit}>
                <input type="hidden" name="supplierId" value={supplierId} />
                <button
                    type="submit"
                    className="btn btn-danger btn-icon"
                    aria-label={isFallback ? "Fallback supplier cannot be deleted" : "Delete supplier"}
                    title={isFallback ? "Fallback supplier cannot be deleted" : "Delete supplier"}
                    disabled={isFallback}
                >
                    <Trash2 size={16} aria-hidden="true" />
                </button>
            </form>
        </div>
    );
}

