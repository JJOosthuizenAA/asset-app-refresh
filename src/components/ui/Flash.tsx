type Props = { ok?: string | null };

export default function Flash({ ok }: Props) {
    if (!ok) return null;
    const msg =
        ok === "created" ? "Created successfully." :
            ok === "deleted" ? "Deleted successfully." :
                "Saved successfully.";
    return (
        <div className="mb-4 rounded border border-green-300 bg-green-50 px-4 py-2 text-sm">
            {msg}
        </div>
    );
}
