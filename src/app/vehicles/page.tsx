// src/app/vehicles/page.tsx
import Link from "next/link";
import { ParentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { dateOrDash } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatName(vehicle: { nickname: string | null; make: string | null; model: string | null; year: number | null }) {
  if (vehicle.nickname) return vehicle.nickname;
  const parts = [vehicle.year?.toString(), vehicle.make, vehicle.model].filter(Boolean);
  return parts.length ? parts.join(" ") : "Vehicle";
}

export default async function VehiclesPage() {
  const accountId = await requireAccountId();

  const vehicles = await prisma.vehicle.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nickname: true,
      make: true,
      model: true,
      year: true,
      vin: true,
      licenseRenewalOn: true,
      insuranceExpiresOn: true,
      createdAt: true,
      primaryAssetId: true,
    },
  });

  const vehicleIds = vehicles.map((v) => v.id);
  const primaryAssetMap = new Map(vehicles.filter((v) => v.primaryAssetId).map((v) => [v.primaryAssetId!, v.id]));

  const assets = vehicleIds.length
    ? await prisma.asset.findMany({
        where: { parentType: ParentType.Vehicle, parentId: { in: vehicleIds } },
        select: { id: true, parentId: true },
      })
    : [];

  const secondaryAssetCount = new Map<string, number>();
  for (const asset of assets) {
    if (primaryAssetMap.has(asset.id)) continue;
    secondaryAssetCount.set(asset.parentId, (secondaryAssetCount.get(asset.parentId) ?? 0) + 1);
  }

  const primaryAssetIds = Array.from(primaryAssetMap.keys());

  const tasks = vehicleIds.length
    ? await prisma.maintenanceTask.findMany({
        where: {
          OR: [
            { parentType: ParentType.Vehicle, parentId: { in: vehicleIds } },
            primaryAssetIds.length ? { assetId: { in: primaryAssetIds } } : undefined,
          ].filter(Boolean) as any,
        },
        select: { id: true, parentId: true, assetId: true },
      })
    : [];

  const taskCountMap = new Map<string, number>();
  const seenTaskIds = new Set<string>();
  for (const task of tasks) {
    if (seenTaskIds.has(task.id)) continue;
    seenTaskIds.add(task.id);
    const vehicleId = task.assetId && primaryAssetMap.has(task.assetId) ? primaryAssetMap.get(task.assetId)! : task.parentId ?? null;
    if (!vehicleId) continue;
    taskCountMap.set(vehicleId, (taskCountMap.get(vehicleId) ?? 0) + 1);
  }

  const documents = vehicleIds.length
    ? await prisma.document.findMany({
        where: {
          accountId,
          deletedAt: null,
          OR: [
            { parentType: ParentType.Vehicle, parentId: { in: vehicleIds } },
            primaryAssetIds.length ? { assetId: { in: primaryAssetIds } } : undefined,
          ].filter(Boolean) as any,
        },
        select: { id: true, parentId: true, assetId: true },
      })
    : [];

  const documentCountMap = new Map<string, number>();
  const seenDocumentIds = new Set<string>();
  for (const doc of documents) {
    if (seenDocumentIds.has(doc.id)) continue;
    seenDocumentIds.add(doc.id);
    const vehicleId = doc.assetId && primaryAssetMap.has(doc.assetId) ? primaryAssetMap.get(doc.assetId)! : doc.parentId ?? null;
    if (!vehicleId) continue;
    documentCountMap.set(vehicleId, (documentCountMap.get(vehicleId) ?? 0) + 1);
  }

  return (
    <main className="container py-8">
      <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Vehicles</h1>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <Link href="/vehicles/new" className="btn btn-primary">
            New Vehicle
          </Link>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <section className="card">
          <div className="card-content">
            <p className="text-muted-foreground" style={{ marginBottom: 8 }}>
              You don&apos;t have any vehicles yet.
            </p>
            <Link href="/vehicles/new" className="btn btn-primary">Add your first vehicle</Link>
          </div>
        </section>
      ) : (
        <section className="card">
          <div className="card-content" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Vehicle</th>
                  <th style={{ width: "20%" }}>VIN</th>
                  <th style={{ width: "18%" }}>Make / Model</th>
                  <th style={{ width: "14%" }}>License Renewal</th>
                  <th style={{ width: "8%", textAlign: "right" }}>Assets</th>
                  <th style={{ width: "6%", textAlign: "right" }}>Tasks</th>
                  <th style={{ width: "6%", textAlign: "right" }}>Docs</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => {
                  const assetCount = secondaryAssetCount.get(vehicle.id) ?? 0;
                  const taskCount = taskCountMap.get(vehicle.id) ?? 0;
                  const documentCount = documentCountMap.get(vehicle.id) ?? 0;

                  return (
                    <tr key={vehicle.id}>
                      <td>
                        <Link href={`/vehicles/${vehicle.id}`}>{formatName(vehicle)}</Link>
                      </td>
                      <td>{vehicle.vin ?? "--"}</td>
                      <td>
                        <div>{vehicle.make ?? "--"}</div>
                        <div className="text-xs text-muted-foreground">{vehicle.model ?? ""}{vehicle.year ? ` ${vehicle.year}` : ""}</div>
                      </td>
                      <td>{dateOrDash(vehicle.licenseRenewalOn)}</td>
                      <td style={{ textAlign: "right" }}>{assetCount}</td>
                      <td style={{ textAlign: "right" }}>{taskCount}</td>
                      <td style={{ textAlign: "right" }}>{documentCount}</td>
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









