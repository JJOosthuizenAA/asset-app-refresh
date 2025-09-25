import Link from "next/link";
import { notFound } from "next/navigation";
import { ParentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { dateOrDash, fmtMoney } from "@/lib/format";
import { getCountryLabel } from "@/lib/countries";
import HelpPopover from "@/components/HelpPopover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const accountId = await requireAccountId();
  const property = await prisma.property.findFirst({
    where: { id: params.id, accountId },
    select: {
      id: true,
      name: true,
      label: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      region: true,
      postalCode: true,
      countryCode: true,
      purchasePriceCents: true,
      purchaseDate: true,
      ownershipStatus: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!property) {
    notFound();
  }

  const [assets, tasks, documents] = await Promise.all([
    prisma.asset.findMany({
      where: { parentType: ParentType.Property, parentId: property.id },
      select: {
        id: true,
        name: true,
        assetType: true,
        status: true,
        purchaseDate: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.maintenanceTask.findMany({
      where: { parentType: ParentType.Property, parentId: property.id },
      select: {
        id: true,
        title: true,
        dueDate: true,
        completed: true,
        isRecurring: true,
        nextDueDate: true,
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.document.findMany({
      where: { parentType: ParentType.Property, parentId: property.id },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const title = property.name || property.label || "Property";
  const countryName = getCountryLabel(property.countryCode) ?? property.countryCode ?? null;

  return (
    <main className="container py-8">
      <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>{title}</h1>
          <p className="text-muted-foreground" style={{ marginTop: 4 }}>
            {property.addressLine1 || property.city ? (
              <>
                {property.addressLine1 && <span>{property.addressLine1}</span>}
                {property.addressLine1 && property.city && <span>, </span>}
                {property.city && <span>{property.city}</span>}
                {property.region && <span>, {property.region}</span>}
                {countryName && <span> {countryName}</span>}
              </>
            ) : (
              <span>No address on file</span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <Link href={`/properties/${property.id}/edit`} className="btn btn-outline">Edit</Link>
          <Link href="/properties" className="btn btn-outline">Back</Link>
        </div>
      </div>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <div className="card-title">Overview</div>
        </div>
        <div className="card-content" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <div className="text-muted-foreground text-xs" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span>Ownership</span>
              <HelpPopover title="Ownership status help">
                Owner means you currently hold the property. Rental flags a leased property, while Sold keeps a record after it leaves your portfolio.
              </HelpPopover>
            </div>
            <div>{property.ownershipStatus}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Purchase Price</div>
            <div>{property.purchasePriceCents != null ? fmtMoney(property.purchasePriceCents / 100) : "--"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Purchased On</div>
            <div>{dateOrDash(property.purchaseDate)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Last Updated</div>
            <div>{dateOrDash(property.updatedAt)}</div>
          </div>
        </div>
        {property.notes ? (
          <div className="card-content" style={{ marginTop: "1rem" }}>
            <div className="text-muted-foreground text-xs" style={{ marginBottom: 4 }}>
              Notes
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{property.notes}</div>
          </div>
        ) : null}
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <div className="card-title">Assets</div>
          <div className="card-description">Assets associated with this property.</div>
        </div>
        <div className="card-content" style={{ padding: 0 }}>
          {assets.length === 0 ? (
            <div className="text-muted-foreground" style={{ padding: "1rem" }}>
              No assets linked yet.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Purchased</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <Link href={`/assets/${asset.id}`}>{asset.name}</Link>
                    </td>
                    <td>{asset.assetType ?? "--"}</td>
                    <td>{asset.status}</td>
                    <td>{dateOrDash(asset.purchaseDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <div className="card-title">Maintenance Tasks</div>
          <div className="card-description">Tasks scheduled directly for this property.</div>
        </div>
        <div className="card-content" style={{ padding: 0 }}>
          {tasks.length === 0 ? (
            <div className="text-muted-foreground" style={{ padding: "1rem" }}>
              No property-level tasks yet.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Next Occurrence</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <Link href={`/tasks/${task.id}`}>{task.title}</Link>
                    </td>
                    <td>{dateOrDash(task.dueDate)}</td>
                    <td>{task.completed ? "Completed" : "Open"}</td>
                    <td>{task.isRecurring ? dateOrDash(task.nextDueDate) : "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Documents</div>
          <div className="card-description">Documents attached to this property.</div>
        </div>
        <div className="card-content" style={{ padding: 0 }}>
          {documents.length === 0 ? (
            <div className="text-muted-foreground" style={{ padding: "1rem" }}>
              No documents yet.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Document date</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>{document.category}</td>
                    <td>
                      <a href={document.filePath} target="_blank" rel="noopener noreferrer" className="underline">
                        {document.title}
                      </a>
                    </td>
                    <td>{document.description ?? "--"}</td>
                    <td>{dateOrDash(document.documentDate)}</td>
                    <td>{dateOrDash(document.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}







