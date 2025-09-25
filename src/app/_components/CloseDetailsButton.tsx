"use client";

export default function CloseDetailsButton({
    children = "Close",
    className = "btn btn-outline",
}: {
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            className={className}
            onClick={(e) => {
                const details = e.currentTarget.closest("details") as HTMLDetailsElement | null;
                if (details) details.open = false;
            }}
        >
            {children}
        </button>
    );
}
