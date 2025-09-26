// src/components/ConfirmButton.tsx
"use client";

import React from "react";

type ConfirmButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    confirmText?: string;
};

export function ConfirmButton({
    children,
    confirmText = "Are you sure?",
    onClick,
    type,
    ...buttonProps
}: ConfirmButtonProps) {
    return (
        <button
            {...buttonProps}
            type={type ?? "submit"}
            onClick={(event) => {
                if (!confirm(confirmText)) {
                    event.preventDefault();
                    return;
                }
                onClick?.(event);
            }}
        >
            {children}
        </button>
    );
}
