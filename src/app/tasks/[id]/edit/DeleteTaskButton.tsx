"use client";

export default function DeleteTaskButton({
    deleteAction,
}: {
    deleteAction: () => Promise<void>;
}) {
    return (
        <form
            action={async () => {
                const ok = confirm("Delete this task?");
                if (!ok) return;
                await deleteAction();
            }}
            style={{ margin: 0 }}
            className="action-slot"
        >
            <button type="submit" className="btn btn-danger">
                Delete
            </button>
        </form>
    );
}
