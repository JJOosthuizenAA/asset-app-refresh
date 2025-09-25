// src/app/assets/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { loadParentSummary, parentRefToHref, ParentTypeLabels } from "@/lib/parents";
import AttachmentsPanel from "@/app/_components/AttachmentsPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string) {
    const major = cents / 100;
    const formatted = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(major);
    return currency ? `${currency} ${formatted}` : formatted;
}

function formatDate(value: Date | null | undefined) {
    if (!value) return "--";
    return value.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
    const accountId = await requireAccountId();
    const id = params.id;

    const asset = await prisma.asset.findFirst({
        where: { id, accountId },
        select: {
            id: true,
            name: true,
            description: true,
            category: true,
            assetType: true,
            serial: true,
            location: true,
            purchaseDate: true,
            purchasePriceCents: true,
            parentType: true,
            parentId: true,
            account: { select: { currencyCode: true } },
        },
    });

    if (!asset) notFound();

    const parent = await loadParentSummary(prisma, accountId, { type: asset.parentType, id: asset.parentId });
    const parentHref = parentRefToHref({ type: asset.parentType, id: asset.parentId });
    const currency = asset.account?.currencyCode ?? "";
    const price = typeof asset.purchasePriceCents === "number" ? formatMoney(asset.purchasePriceCents, currency) : "-";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeWarranties, openMaintenance] = await Promise.all([
        prisma.warranty.findMany({
            where: {
                assetId: asset.id,
                OR: [{ expiresAt: null }, { expiresAt: { gte: today } }],
            },
            orderBy: { expiresAt: "asc" },
            select: {
                id: true,
                name: true,
                expiresAt: true,
            },
        }),
        prisma.maintenanceTask.findMany({
            where: {
                assetId: asset.id,
                completed: false,
                cancelledAt: null,
            },
            orderBy: [
                { dueDate: "asc" },
                { nextDueDate: "asc" },
                { createdAt: "asc" },
            ],
            select: {
                id: true,
                title: true,
                dueDate: true,
                nextDueDate: true,
                isRecurring: true,
            },
        }),
    ]);

    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>{asset.name}</h1>
                <div style={{ display: "flex", gap: ".5rem" }}>
                    <Link href={`/assets/${asset.id}/edit`} className="btn btn-outline">Edit</Link>
                    <Link href="/assets" className="btn btn-outline">Back</Link>
                </div>
            </div>

            <section className="card" style={{ marginBottom: "1.5rem" }}>
                <div className="card-header">
                    <div className="card-title">Coverage & Maintenance</div>
                    <div className="card-description">Keep an eye on warranties and open maintenance tied to this asset.</div>
                </div>
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div>
                        <div className="text-muted-foreground text-xs" style={{ marginBottom: ".25rem" }}>Active warranties</div>
                        {activeWarranties.length ? (
                            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                                {activeWarranties.map((warranty) => (
                                    <li key={warranty.id}>
                                        <Link href={`/warranties/${warranty.id}`}>{warranty.name}</Link>
                                        <span className="text-muted-foreground"> (expires {formatDate(warranty.expiresAt)})</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-muted-foreground">No active warranties</div>
                        )}
                    </div>

                    <div>
                        <div className="text-muted-foreground text-xs" style={{ marginBottom: ".25rem" }}>Open maintenance items</div>
                        {openMaintenance.length ? (
                            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                                {openMaintenance.map((task) => (
                                    <li key={task.id}>
                                        <Link href={`/tasks/${task.id}`}>{task.title}</Link>
                                        <span className="text-muted-foreground">
                                            {task.dueDate ? ` • due ${formatDate(task.dueDate)}` : task.isRecurring && task.nextDueDate ? ` • next ${formatDate(task.nextDueDate)}` : ""}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-muted-foreground">No open maintenance tasks</div>
                        )}
                    </div>
                </div>
            </section>

            <section className="card">
                <div className="card-header">
                    <div className="card-title">Details</div>
                </div>
                <div className="card-content">
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                        <div>
                            <small className="text-muted-foreground">Container</small>
                            <div>
                                {parent && parentHref ? (
                                    <Link href={parentHref}>{parent.label}</Link>
                                ) : (
                                    parent?.label ?? "--"
                                )}
                            </div>
                            <small className="text-muted-foreground text-xs">Type: {ParentTypeLabels[asset.parentType]}</small>
                        </div>

                        <div>
                            <small className="text-muted-foreground">Category</small>
                            <div>{asset.category ?? asset.assetType ?? "-"}</div>
                        </div>

                        <div>
                            <small className="text-muted-foreground">Location</small>
                            <div>{asset.location ?? "-"}</div>
                        </div>

                        <div>
                            <small className="text-muted-foreground">Serial</small>
                            <div>{asset.serial ?? "-"}</div>
                        </div>

                        <div>
                            <small className="text-muted-foreground">Purchase Date</small>
                            <div>{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "-"}</div>
                        </div>

                        <div>
                            <small className="text-muted-foreground">Purchase Price</small>
                            <div>{price}</div>
                        </div>

                        {asset.description && (
                            <div>
                                <small className="text-muted-foreground">Description</small>
                                <div>{asset.description}</div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <AttachmentsPanel
                targetType="asset"
                targetId={asset.id}
                heading="Documents"
                description="Attach invoices, statements, and supporting files for this asset."
            />
        </main>
    );
}



