// src/app/warranties/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import DeleteWarrantyButton from "./DeleteWarrantyButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const pickParam = (params: SearchParams, key: string): string => {
    const value = params[key];
    return Array.isArray(value) ? (value[0] ?? "") : value ?? "";
};

async function deleteWarrantyAction(id: string, currentSearch: string) {
    "use server";

    await requireAccountId();
    await prisma.warranty.delete({ where: { id } });
    revalidatePath(`/warranties${currentSearch ? `?${currentSearch}` : ""}`);
}

export default async function WarrantiesIndex({ searchParams }: { searchParams: SearchParams }) {
    const accountId = await requireAccountId();

    const q = pickParam(searchParams, "q").trim();
    const statusParam = pickParam(searchParams, "statusFilter").trim().toLowerCase();
    const status: "all" | "active" | "expired" =
        statusParam === "active" || statusParam === "expired" ? (statusParam as "active" | "expired") : "all";

    const assetFilter = pickParam(searchParams, "asset").trim();
    const sortParam = pickParam(searchParams, "sort");
    const dirParam = pickParam(searchParams, "dir");
    const sort: "expiresAt" | "createdAt" | "name" =
        sortParam === "createdAt" || sortParam === "name" ? (sortParam as any) : "expiresAt";
    const dir: "asc" | "desc" = dirParam === "desc" ? "desc" : "asc";

    const page = Math.max(1, parseInt(pickParam(searchParams, "page") || "1", 10) || 1);
    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    const filters: any[] = [{ asset: { accountId } }];

    if (q) {
        filters.push({
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { provider: { contains: q, mode: "insensitive" } },
                { policyNo: { contains: q, mode: "insensitive" } },
                { asset: { name: { contains: q, mode: "insensitive" } } },
            ],
        });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (status === "active") {
        filters.push({ OR: [{ expiresAt: null }, { expiresAt: { gte: today } }] });
    } else if (status === "expired") {
        filters.push({ expiresAt: { lt: today } });
    }

    if (assetFilter) {
        filters.push({ assetId: assetFilter });
    }

    const where = filters.length ? { AND: filters } : {};

    const orderBy: any[] = [];
    if (sort === "expiresAt") orderBy.push({ expiresAt: dir });
    if (sort === "createdAt") orderBy.push({ createdAt: dir });
    if (sort === "name") orderBy.push({ name: dir });
    if (!orderBy.length) orderBy.push({ expiresAt: "asc" as const });

    const [total, rows, assets] = await Promise.all([
        prisma.warranty.count({ where }),
        prisma.warranty.findMany({
            where,
            orderBy,
            skip,
            take: pageSize,
            select: {
                id: true,
                name: true,
                provider: true,
                policyNo: true,
                expiresAt: true,
                asset: { select: { id: true, name: true, accountId: true } },
                createdAt: true,
                updatedAt: true,
            },
        }),
        prisma.asset.findMany({
            where: { accountId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentSearch = new URLSearchParams({
        ...(q ? { q } : {}),
        ...(status !== "all" ? { statusFilter: status } : {}),
        ...(assetFilter ? { asset: assetFilter } : {}),
        sort,
        dir,
        page: String(page),
    }).toString();

    const formatDate = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : "--");

    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>Warranties</h1>
                <Link href="/warranties/new" className="btn btn-primary">New Warranty</Link>
            </div>

            <form method="get" action="/warranties" className="card" style={{ marginBottom: "1rem" }}>
                <div className="card-header">
                    <div className="card-title">Filter</div>
                </div>
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="grid grid-3">
                        <div className="field">
                            <label htmlFor="q" className="label">Search</label>
                            <input id="q" name="q" type="text" placeholder="Name, provider, policy" defaultValue={q} />
                        </div>
                        <div className="field">
                            <label htmlFor="statusFilter" className="label">Status</label>
                            <select id="statusFilter" name="statusFilter" defaultValue={status}>
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="asset" className="label">Asset</label>
                            <select id="asset" name="asset" defaultValue={assetFilter}>
                                <option value="">All</option>
                                {assets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-3">
                        <div className="field">
                            <label htmlFor="sort" className="label">Sort by</label>
                            <select id="sort" name="sort" defaultValue={sort}>
                                <option value="expiresAt">Expires</option>
                                <option value="createdAt">Created</option>
                                <option value="name">Name</option>
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="dir" className="label">Direction</label>
                            <select id="dir" name="dir" defaultValue={dir}>
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </div>
                        <div className="field" style={{ alignSelf: "end" }}>
                            <div className="space-x-2">
                                <button className="btn btn-outline" type="submit">Apply</button>
                                <Link href="/warranties" className="btn btn-outline">Reset</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div className="text-sm text-muted-foreground" style={{ marginBottom: "1rem" }}>
                Showing <strong className="text-foreground">{rows.length}</strong> of{' '}
                <strong className="text-foreground">{total}</strong> warranty(ies)
            </div>

            <div className="card">
                <div className="card-content" style={{ padding: 0 }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Asset</th>
                                <th>Provider</th>
                                <th>Policy #</th>
                                <th>Expires</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((warranty) => {
                                const expired = !!warranty.expiresAt && warranty.expiresAt < new Date();
                                const assetLink = warranty.asset ? (
                                    <Link href={`/assets/${warranty.asset.id}`}>{warranty.asset.name}</Link>
                                ) : (
                                    <span className="text-muted-foreground">--</span>
                                );

                                return (
                                    <tr key={warranty.id}>
                                        <td>
                                            <div className="font-medium">
                                                <Link href={`/warranties/${warranty.id}`}>{warranty.name}</Link>
                                            </div>
                                        </td>
                                        <td>{assetLink}</td>
                                        <td>{warranty.provider ?? "--"}</td>
                                        <td>{warranty.policyNo ?? "--"}</td>
                                        <td>
                                            {expired ? (
                                                <span className="badge badge-open">Expired {formatDate(warranty.expiresAt)}</span>
                                            ) : (
                                                <span>{formatDate(warranty.expiresAt)}</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="actions-flex" style={{ gridTemplateColumns: "110px 110px 110px" }}>
                                                <span className="action-slot">
                                                    <Link href={`/warranties/${warranty.id}`} className="btn btn-outline">View</Link>
                                                </span>
                                                <span className="action-slot">
                                                    <Link href={`/warranties/${warranty.id}/edit`} className="btn btn-outline">Edit</Link>
                                                </span>
                                                <DeleteWarrantyButton
                                                    className="action-slot"
                                                    deleteAction={deleteWarrantyAction.bind(null, warranty.id, currentSearch)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center" }} className="text-muted-foreground">
                                        No warranties found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="text-muted-foreground">
                    Page <strong className="text-foreground">{page}</strong> of{' '}
                    <strong className="text-foreground">{totalPages}</strong>
                </div>
                <div className="space-x-2">
                    {page > 1 ? (
                        <Link
                            href={`/warranties?${new URLSearchParams({
                                ...(q ? { q } : {}),
                                ...(status !== "all" ? { statusFilter: status } : {}),
                                ...(assetFilter ? { asset: assetFilter } : {}),
                                sort,
                                dir,
                                page: String(page - 1),
                            }).toString()}`}
                            className="btn btn-outline"
                        >
                            Prev
                        </Link>
                    ) : (
                        <span className="btn btn-outline" style={{ opacity: 0.6, pointerEvents: "none" }}>Prev</span>
                    )}

                    {page < totalPages ? (
                        <Link
                            href={`/warranties?${new URLSearchParams({
                                ...(q ? { q } : {}),
                                ...(status !== "all" ? { statusFilter: status } : {}),
                                ...(assetFilter ? { asset: assetFilter } : {}),
                                sort,
                                dir,
                                page: String(page + 1),
                            }).toString()}`}
                            className="btn btn-outline"
                        >
                            Next
                        </Link>
                    ) : (
                        <span className="btn btn-outline" style={{ opacity: 0.6, pointerEvents: "none" }}>Next</span>
                    )}
                </div>
            </div>
        </main>
    );
}
