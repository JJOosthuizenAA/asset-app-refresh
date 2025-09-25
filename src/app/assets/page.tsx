// src/app/assets/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AssetType, ParentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import {
    ParentTypeLabels,
    parentTypeOrder,
    listParentsByType,
    type ParentSummary,
} from "@/lib/parents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = {
    q?: string;
    parentType?: string;
    parent?: string; // encoded as `${ParentType}:${id}`
    type?: string; // AssetType value
    sort?: string; // name-asc | createdAt-desc | purchaseDate-desc | purchaseDate-asc
    page?: string; // 1-based
};

const PAGE_SIZE = 20;

function parseParentSelection(parentParam: string | undefined, typeParam: string | undefined) {
    const parentValue = (parentParam ?? "").trim();
    const typeValue = (typeParam ?? "").trim();

    const enumValues = Object.values(ParentType) as string[];

    let selectedType: ParentType | null = null;
    let selectedId = "";
    let encoded = "";

    if (parentValue) {
        const [maybeType, maybeId] = parentValue.split(":");
        if (maybeType && maybeId && enumValues.includes(maybeType)) {
            selectedType = maybeType as ParentType;
            selectedId = maybeId;
            encoded = `${maybeType}:${maybeId}`;
        }
    }

    if (!selectedType && typeValue && enumValues.includes(typeValue)) {
        selectedType = typeValue as ParentType;
    }

    return {
        selectedType,
        selectedId,
        encoded,
    };
}

async function deleteAssetAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();
    const id = String(formData.get("id") ?? "");
    const prev = String(formData.get("prev") ?? "/assets");

    const asset = await prisma.asset.findFirst({
        where: { id, accountId },
        select: { id: true },
    });
    if (!asset) {
        throw new Error("Asset not found or not in this account");
    }

    await prisma.warranty.deleteMany({ where: { assetId: id } });
    await prisma.maintenanceTask.deleteMany({ where: { assetId: id } });
    await prisma.asset.delete({ where: { id } });

    revalidatePath("/assets");
    redirect(prev);
}

export default async function AssetsIndex({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const accountId = await requireAccountId();

    const q = (searchParams.q ?? "").trim();
    const sort = (searchParams.sort ?? "createdAt-desc").trim();
    const page = Math.max(1, Number(searchParams.page ?? "1"));
    const skip = (page - 1) * PAGE_SIZE;

    const parentSelection = parseParentSelection(searchParams.parent, searchParams.parentType);
    let { selectedType: parentTypeFilter, selectedId: parentIdFilter, encoded: parentEncoded } = parentSelection;

    const typeFilterRaw = (searchParams.type ?? "").trim();
    const isValidAssetType = (value: string): value is AssetType =>
        (Object.values(AssetType) as string[]).includes(value);
    const assetTypeFilter = typeFilterRaw && isValidAssetType(typeFilterRaw) ? typeFilterRaw : "";

    const where: any = { accountId };
    if (parentTypeFilter) {
        where.parentType = parentTypeFilter;
    }
    if (parentIdFilter) {
        where.parentId = parentIdFilter;
    }
    if (assetTypeFilter) {
        where.assetType = assetTypeFilter;
    }
    if (q) {
        where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { serial: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
        ];
    }

    const orderBy: any[] = [];
    switch (sort) {
        case "name-asc":
            orderBy.push({ name: "asc" });
            break;
        case "purchaseDate-asc":
            orderBy.push({ purchaseDate: "asc" });
            break;
        case "purchaseDate-desc":
            orderBy.push({ purchaseDate: "desc" });
            break;
        case "createdAt-desc":
        default:
            orderBy.push({ createdAt: "desc" });
            break;
    }

    const [total, assets, parentsByType, account] = await Promise.all([
        prisma.asset.count({ where }),
        prisma.asset.findMany({
            where,
            orderBy,
            skip,
            take: PAGE_SIZE,
            select: {
                id: true,
                name: true,
                assetType: true,
                serial: true,
                location: true,
                purchaseDate: true,
                purchasePriceCents: true,
                parentType: true,
                parentId: true,
                createdAt: true,
            },
        }),
        listParentsByType(prisma, accountId),
        prisma.account.findUnique({
            where: { id: accountId },
            select: { currencyCode: true },
        }),
    ]);

    const currency = account?.currencyCode ?? "ZAR";
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const typeOptions = Object.values(AssetType);

    const parentLookup = new Map<string, ParentSummary>();
    const containerOptions: Array<{ value: string; label: string }> = [];
    for (const type of parentTypeOrder) {
        const items = parentsByType[type] ?? [];
        for (const parent of items) {
            const value = `${type}:${parent.id}`;
            parentLookup.set(value, parent);
            containerOptions.push({ value, label: `${ParentTypeLabels[type]} • ${parent.label}` });
        }
    }

    if (parentEncoded && !parentLookup.has(parentEncoded)) {
        parentEncoded = "";
        parentIdFilter = "";
        parentTypeFilter = null;
    }

    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (parentTypeFilter) query.set("parentType", parentTypeFilter);
    if (parentIdFilter && parentTypeFilter) {
        const encoded = `${parentTypeFilter}:${parentIdFilter}`;
        query.set("parent", encoded);
        parentEncoded = encoded;
    } else if (parentEncoded) {
        query.set("parent", parentEncoded);
    }
    if (assetTypeFilter) query.set("type", assetTypeFilter);
    if (sort) query.set("sort", sort);
    if (page > 1) query.set("page", String(page));
    const currentUrl = `/assets${query.toString() ? `?${query.toString()}` : ""}`;

    const nf = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "ZAR",
        currencyDisplay: "code",
        maximumFractionDigits: 2,
    });

    return (
        <main className="container py-8">
            <h1>Assets</h1>

            <div className="space-x-2" style={{ marginTop: 12 }}>
                <Link href="/assets/new" className="btn btn-primary">
                    New Asset
                </Link>
            </div>

            <form method="get" className="card" style={{ marginTop: "1rem" }}>
                <div className="card-content" style={{ display: "grid", gap: "0.75rem" }}>
                    <div className="grid grid-3">
                        <div className="field">
                            <label htmlFor="q" className="label">Search</label>
                            <input
                                id="q"
                                name="q"
                                type="text"
                                placeholder="Name, serial, location."
                                defaultValue={q}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="parentType" className="label">Container type</label>
                            <select id="parentType" name="parentType" defaultValue={parentTypeFilter ?? ""}>
                                <option value="">All</option>
                                {parentTypeOrder.map((type) => (
                                    <option key={type} value={type}>
                                        {ParentTypeLabels[type]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="parent" className="label">Container</label>
                            <select id="parent" name="parent" defaultValue={parentEncoded}>
                                <option value="">All</option>
                                {containerOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-3">
                        <div className="field">
                            <label htmlFor="type" className="label">Asset type</label>
                            <select id="type" name="type" defaultValue={assetTypeFilter}>
                                <option value="">All</option>
                                {typeOptions.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="sort" className="label">Sort by</label>
                            <select id="sort" name="sort" defaultValue={sort}>
                                <option value="createdAt-desc">Newest created</option>
                                <option value="name-asc">Name (A-Z)</option>
                                <option value="purchaseDate-desc">Purchase date (newest)</option>
                                <option value="purchaseDate-asc">Purchase date (oldest)</option>
                            </select>
                        </div>

                        <div className="field" style={{ alignSelf: "end" }}>
                            <div className="space-x-2">
                                <button className="btn btn-outline" type="submit">Apply</button>
                                <Link href="/assets" className="btn btn-outline">Reset</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <div className="card" style={{ marginTop: "1rem" }}>
                <div className="card-content" style={{ padding: 0 }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Container</th>
                                <th>Location</th>
                                <th>Purchase date</th>
                                <th>Price</th>
                                <th style={{ width: 360 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-muted-foreground">
                                        No assets found.
                                    </td>
                                </tr>
                            ) : (
                                assets.map((assetRow) => {
                                    const dateStr = assetRow.purchaseDate
                                        ? new Date(assetRow.purchaseDate).toLocaleDateString()
                                        : "-";
                                    const priceStr =
                                        assetRow.purchasePriceCents != null
                                            ? nf.format(assetRow.purchasePriceCents / 100)
                                            : "-";

                                    const parentKey = `${assetRow.parentType}:${assetRow.parentId}`;
                                    const parent = parentLookup.get(parentKey);
                                    const parentLabel = parent?.label ?? "—";
                                    const parentTypeLabel = ParentTypeLabels[assetRow.parentType];

                                    return (
                                        <tr key={assetRow.id}>
                                            <td>
                                                <Link href={`/assets/${assetRow.id}`}>{assetRow.name}</Link>
                                                {assetRow.serial ? (
                                                    <div className="text-xs text-muted-foreground">
                                                        Serial/VIN: {assetRow.serial}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td>{assetRow.assetType ?? "-"}</td>
                                            <td>
                                                <div>{parentLabel}</div>
                                                <div className="text-xs text-muted-foreground">{parentTypeLabel}</div>
                                            </td>
                                            <td>{assetRow.location ?? "-"}</td>
                                            <td>{dateStr}</td>
                                            <td>{priceStr}</td>
                                            <td>
                                                <div className="actions-flex assets">
                                                    <Link href={`/assets/${assetRow.id}`} className="btn btn-outline">
                                                        View
                                                    </Link>
                                                    <Link href={`/assets/${assetRow.id}/edit`} className="btn btn-outline">
                                                        Edit
                                                    </Link>
                                                    <form action={deleteAssetAction} className="action-slot">
                                                        <input type="hidden" name="id" value={assetRow.id} />
                                                        <input type="hidden" name="prev" value={currentUrl} />
                                                        <button
                                                            type="submit"
                                                            className="btn btn-danger"
                                                            formAction={async (fd) => {
                                                                "use server";
                                                                await deleteAssetAction(fd);
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {pageCount > 1 && (
                <div className="space-x-2" style={{ marginTop: "1rem" }}>
                    {page > 1 ? (
                        <Link
                            className="btn btn-outline"
                            href={`/assets?${new URLSearchParams({
                                ...(q ? { q } : {}),
                                ...(parentTypeFilter ? { parentType: parentTypeFilter } : {}),
                                ...(parentEncoded ? { parent: parentEncoded } : {}),
                                ...(assetTypeFilter ? { type: assetTypeFilter } : {}),
                                ...(sort ? { sort } : {}),
                                page: String(page - 1),
                            }).toString()}`}
                        >
                            Prev
                        </Link>
                    ) : (
                        <span className="btn btn-outline" aria-disabled="true">Prev</span>
                    )}

                    <span className="text-xs">Page {page} of {pageCount}</span>

                    {page < pageCount ? (
                        <Link
                            className="btn btn-outline"
                            href={`/assets?${new URLSearchParams({
                                ...(q ? { q } : {}),
                                ...(parentTypeFilter ? { parentType: parentTypeFilter } : {}),
                                ...(parentEncoded ? { parent: parentEncoded } : {}),
                                ...(assetTypeFilter ? { type: assetTypeFilter } : {}),
                                ...(sort ? { sort } : {}),
                                page: String(page + 1),
                            }).toString()}`}
                        >
                            Next
                        </Link>
                    ) : (
                        <span className="btn btn-outline" aria-disabled="true">Next</span>
                    )}
                </div>
            )}
        </main>
    );
}

