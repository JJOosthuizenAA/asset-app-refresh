// src/app/other/new/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createOtherContainerAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();
    const label = (formData.get("label") as string | null)?.trim() || "";
    const notes = (formData.get("notes") as string | null)?.trim() || null;

    if (!label) throw new Error("Label is required");

    const container = await prisma.otherContainer.create({
        data: {
            accountId,
            label,
            notes,
        },
        select: { id: true },
    });

    revalidatePath("/other");
    revalidatePath(`/other/${container.id}`);
    redirect(`/other/${container.id}`);
}

export default function NewOtherContainerPage() {
    return (
        <main className="container py-8" style={{ maxWidth: 640 }}>
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>New Other Container</h1>
                <Link href="/other" className="btn btn-outline">Back</Link>
            </div>

            <form action={createOtherContainerAction} className="card">
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <label className="field">
                        <span className="label">Label <span className="req">*</span></span>
                        <input name="label" required placeholder="e.g. Storage Unit" />
                    </label>

                    <label className="field">
                        <span className="label">Notes</span>
                        <textarea name="notes" rows={4} placeholder="Describe what lives here" />
                    </label>

                    <div className="space-x-2">
                        <Link href="/other" className="btn btn-outline">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </main>
    );
}
