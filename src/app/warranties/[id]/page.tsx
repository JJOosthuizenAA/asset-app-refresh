// src/app/warranties/[id]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import AttachmentsPanel from "@/app/_components/AttachmentsPanel";
import DeleteWarrantyButton from "../DeleteWarrantyButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function deleteWarrantyAction(id: string) {
    "use server";

    await requireAccountId();
    await prisma.warranty.delete({ where: { id } });
    revalidatePath("/warranties");
    redirect("/warranties");
}

export default async function ViewWarrantyPage({ params }: { params: { id: string } }) {
    const accountId = await requireAccountId();
    const warranty = await prisma.warranty.findUnique({
        where: { id: params.id },
        select: {
            id: true,
            name: true,
            provider: true,
            policyNo: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
            asset: { select: { id: true, name: true, accountId: true } },
        },
    });

    if (!warranty || !warranty.asset || warranty.asset.accountId !== accountId) {
        notFound();
    }

    const formatDate = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : "--");
    const expired = !!warranty.expiresAt && warranty.expiresAt < new Date();

    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1>Warranty</h1>
                    <div className="text-muted-foreground">
                        {expired ? (
                            <span className="badge badge-open" style={{ marginRight: ".5rem" }}>Expired</span>
                        ) : (
                            <span className="badge badge-completed" style={{ marginRight: ".5rem" }}>Active</span>
                        )}
                        <small>Updated {formatDate(warranty.updatedAt)}</small>
                    </div>
                </div>

                <div className="actions-flex" style={{ gridTemplateColumns: "110px 110px 110px" }}>
                    <span className="action-slot">
                        <Link href="/warranties" className="btn btn-outline">Back</Link>
                    </span>
                    <span className="action-slot">
                        <Link href={`/warranties/${warranty.id}/edit`} className="btn btn-outline">Edit</Link>
                    </span>
                    <DeleteWarrantyButton deleteAction={deleteWarrantyAction.bind(null, warranty.id)} />
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="card-title">Details</div>
                </div>
                <div className="card-content">
                    <div className="grid grid-2">
                        <div className="field">
                            <label className="label">Name</label>
                            <div>{warranty.name}</div>
                        </div>
                        <div className="field">
                            <label className="label">Asset</label>
                            <div>
                                <Link href={`/assets/${warranty.asset.id}`}>{warranty.asset.name}</Link>
                            </div>
                        </div>
                        <div className="field">
                            <label className="label">Provider</label>
                            <div>{warranty.provider ?? <span className="text-muted-foreground">--</span>}</div>
                        </div>
                        <div className="field">
                            <label className="label">Policy #</label>
                            <div>{warranty.policyNo ?? <span className="text-muted-foreground">--</span>}</div>
                        </div>
                        <div className="field">
                            <label className="label">Expires</label>
                            <div>{formatDate(warranty.expiresAt)}</div>
                        </div>
                    </div>

                    <div className="text-muted-foreground" style={{ marginTop: "1rem", fontSize: ".85rem" }}>
                        <div>Created: {formatDate(warranty.createdAt)}</div>
                        <div>Updated: {formatDate(warranty.updatedAt)}</div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-start", gap: ".5rem", marginTop: "1rem" }}>
                        <Link href={`/warranties/${warranty.id}/edit`} className="btn btn-outline">Edit</Link>
                        <Link href="/warranties" className="btn btn-outline">Back</Link>
                    </div>
                </div>
            </div>
                <AttachmentsPanel
            targetType="warranty"
            targetId={warranty.id}
            heading="Documents"
            description="Store scans of policies, statements, and supporting paperwork for this warranty."
        />
        </main>
    );
}








