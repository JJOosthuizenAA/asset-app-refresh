// src/app/warranties/DeleteWarrantyButton.tsx
"use client";

export default function DeleteWarrantyButton({
    deleteAction,
    className,
}: {
    deleteAction: () => Promise<void>;
    className?: string;
}) {
    return (
        <form
            action={async () => {
                const ok = confirm("Delete this warranty?");
                if (!ok) return;
                await deleteAction();
            }}
            style={{ margin: 0 }}
            className={className ?? "action-slot"}
        >
            <button type="submit" className="btn btn-danger">Delete</button>
        </form>
    );
}
