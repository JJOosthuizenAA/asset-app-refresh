// src/app/other/[id]/edit/page.tsx
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { dateOrDash } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function updateOtherContainerAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();
    const id = (formData.get("id") as string | null)?.trim() || "";
    if (!id) throw new Error("Missing container id");

    const label = (formData.get("label") as string | null)?.trim() || "";
    if (!label) throw new Error("Label is required");

    const notes = (formData.get("notes") as string | null)?.trim() || null;

    const existing = await prisma.otherContainer.findFirst({ where: { id, accountId }, select: { id: true } });
    if (!existing) throw new Error("Container not found");

    await prisma.otherContainer.update({
        where: { id },
        data: { label, notes },
    });

    revalidatePath(`/other/${id}`);
    revalidatePath("/other");
    redirect(`/other/${id}`);
}

export default async function EditOtherContainerPage({ params }: { params: { id: string } }) {
    const accountId = await requireAccountId();

    const container = await prisma.otherContainer.findFirst({
        where: { id: params.id, accountId },
        select: { id: true, label: true, notes: true, createdAt: true, updatedAt: true },
    });

    if (!container) notFound();

    return (
        <main className="container py-8" style={{ maxWidth: 640 }}>
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1>Edit Other Container</h1>
                    <p className="text-muted-foreground" style={{ marginTop: 4 }}>
                        Created {dateOrDash(container.createdAt)} · Updated {dateOrDash(container.updatedAt)}
                    </p>
                </div>
                <Link href={`/other/${container.id}`} className="btn btn-outline">Back</Link>
            </div>

            <form action={updateOtherContainerAction} className="card">
                <input type="hidden" name="id" value={container.id} />
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <label className="field">
                        <span className="label">Label <span className="req">*</span></span>
                        <input name="label" defaultValue={container.label} required />
                    </label>

                    <label className="field">
                        <span className="label">Notes</span>
                        <textarea name="notes" rows={4} defaultValue={container.notes ?? ""} />
                    </label>

                    <div className="space-x-2">
                        <Link href={`/other/${container.id}`} className="btn btn-outline">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </main>
    );
}
