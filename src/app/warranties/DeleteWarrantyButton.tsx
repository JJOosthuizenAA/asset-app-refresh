// src/app/warranties/DeleteWarrantyButton.tsx
"use client";

type DeleteWarrantyButtonProps = {
    deleteAction: () => Promise<void>;
    className?: string;
    buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        confirmText?: string;
    };
};

export default function DeleteWarrantyButton({ deleteAction, className, buttonProps }: DeleteWarrantyButtonProps) {
    const { confirmText = "Delete this warranty?", onClick, type, ...rest } = buttonProps ?? {};

    return (
        <form
            action={async () => {
                const ok = confirm(confirmText);
                if (!ok) return;
                await deleteAction();
            }}
            style={{ margin: 0 }}
            className={className ?? "action-slot"}
        >
            <button
                {...rest}
                type={type ?? "submit"}
                className={rest.className ?? "btn btn-danger"}
                onClick={(event) => {
                    onClick?.(event);
                    if (event.defaultPrevented) return;
                }}
            >
                {rest.children ?? "Delete"}
            </button>
        </form>
    );
}
