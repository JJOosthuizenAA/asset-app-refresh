// src/app/properties/page.tsx
import Link from "next/link";
import { ParentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { dateOrDash, fmtMoney } from "@/lib/format";
import { getCountryLabel } from "@/lib/countries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function summarizeLocation(property: { city: string | null; region: string | null; countryCode: string | null }) {
  const country = getCountryLabel(property.countryCode) ?? property.countryCode;
  const parts = [property.city, property.region, country].filter(Boolean);
  return parts.length ? parts.join(", ") : "--";
}

export default async function PropertiesPage() {
  const accountId = await requireAccountId();

  const properties = await prisma.property.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      label: true,
      city: true,
      region: true,
      countryCode: true,
      purchasePriceCents: true,
      purchaseDate: true,
      ownershipStatus: true,
      createdAt: true,
    },
  });

  const propertyIds = properties.map((p) => p.id);

  const [assetCounts, taskCounts, documentCounts] = await Promise.all([
    propertyIds.length
      ? prisma.asset.groupBy({
          by: ["parentId"],
          where: { parentType: ParentType.Property, parentId: { in: propertyIds } },
          _count: { parentId: true },
        })
      : Promise.resolve([]),
    propertyIds.length
      ? prisma.maintenanceTask.groupBy({
          by: ["parentId"],
          where: { parentType: ParentType.Property, parentId: { in: propertyIds } },
          _count: { parentId: true },
        })
      : Promise.resolve([]),
    propertyIds.length
      ? prisma.document.groupBy({
          by: ["parentId"],
          where: { parentType: ParentType.Property, parentId: { in: propertyIds } },
          _count: { parentId: true },
        })
      : Promise.resolve([]),
  ]);

  const assetCountMap = new Map(assetCounts.map((entry) => [entry.parentId, entry._count.parentId]));
  const taskCountMap = new Map(taskCounts.map((entry) => [entry.parentId, entry._count.parentId]));
  const documentCountMap = new Map(documentCounts.map((entry) => [entry.parentId, entry._count.parentId]));

  return (
    <main className="container py-8">
      <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Properties</h1>
        <Link href="/properties/new" className="btn btn-primary">New Property</Link>
      </div>

      {properties.length === 0 ? (
        <section className="card">
          <div className="card-content" style={{ display: "grid", gap: "0.75rem" }}>
            <p className="text-muted-foreground">You don&apos;t have any properties yet.</p>
            <Link href="/properties/new" className="btn btn-primary">Create your first property</Link>
          </div>
        </section>
      ) : (
        <section className="card">
          <div className="card-content" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Name</th>
                  <th style={{ width: "24%" }}>Location</th>
                  <th style={{ width: "16%" }}>Ownership</th>
                  <th style={{ width: "12%" }}>Purchase</th>
                  <th style={{ width: "8%", textAlign: "right" }}>Assets</th>
                  <th style={{ width: "6%", textAlign: "right" }}>Tasks</th>
                  <th style={{ width: "6%", textAlign: "right" }}>Docs</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => {
                  const assets = assetCountMap.get(property.id) ?? 0;
                  const tasks = taskCountMap.get(property.id) ?? 0;
                  const documents = documentCountMap.get(property.id) ?? 0;

                  return (
                    <tr key={property.id}>
                      <td>
                        <div className="font-medium">
                          <Link href={`/properties/${property.id}`}>{property.name || property.label || "Property"}</Link>
                        </div>
                        {property.label && property.label !== property.name ? (
                          <div className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                            {property.label}
                          </div>
                        ) : null}
                      </td>
                      <td>{summarizeLocation(property)}</td>
                      <td>{property.ownershipStatus}</td>
                      <td>
                        <div>{property.purchasePriceCents != null ? fmtMoney(property.purchasePriceCents / 100) : "--"}</div>
                        <div className="text-xs text-muted-foreground">{dateOrDash(property.purchaseDate)}</div>
                      </td>
                      <td style={{ textAlign: "right" }}>{assets}</td>
                      <td style={{ textAlign: "right" }}>{tasks}</td>
                      <td style={{ textAlign: "right" }}>{documents}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}







