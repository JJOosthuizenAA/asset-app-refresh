// src/components/ConfirmButton.tsx
"use client";

import React from "react";

export function ConfirmButton({
    children,
    confirmText = "Are you sure?",
    className = "",
}: {
    children: React.ReactNode;
    confirmText?: string;
    className?: string;
}) {
    return (
        <button
            type="submit"
            className={className}
            onClick={(e) => {
                if (!confirm(confirmText)) e.preventDefault();
            }}
        >
            {children}
        </button>
    );
}
