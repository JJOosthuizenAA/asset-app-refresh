// src/app/vehicles/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ParentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import AttachmentsPanel from "@/app/_components/AttachmentsPanel";
import { requireAccountId } from "@/lib/current-account";
import { dateOrDash } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatVehicleTitle(vehicle: { nickname: string | null; make: string | null; model: string | null; year: number | null }) {
  if (vehicle.nickname) return vehicle.nickname;
  const parts = [vehicle.year?.toString(), vehicle.make, vehicle.model].filter(Boolean);
  return parts.length ? parts.join(" ") : "Vehicle";
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const identifier = key(item);
    if (seen.has(identifier)) continue;
    seen.add(identifier);
    result.push(item);
  }
  return result;
}

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const accountId = await requireAccountId();
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: params.id, accountId },
    select: {
      id: true,
      nickname: true,
      vin: true,
      make: true,
      model: true,
      year: true,
      licenseRenewalOn: true,
      insuranceExpiresOn: true,
      servicePlanExpiresOn: true,
      roadworthyExpiresOn: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      primaryAssetId: true,
    },
  });

  if (!vehicle) {
    notFound();
  }

  const [vehicleAssets, rawTasks] = await Promise.all([
    prisma.asset.findMany({
      where: { parentType: ParentType.Vehicle, parentId: vehicle.id },
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
      where: vehicle.primaryAssetId
        ? {
            OR: [
              { parentType: ParentType.Vehicle, parentId: vehicle.id },
              { assetId: vehicle.primaryAssetId },
            ],
          }
        : { parentType: ParentType.Vehicle, parentId: vehicle.id },
      select: {
        id: true,
        title: true,
        dueDate: true,
        completed: true,
        isRecurring: true,
        nextDueDate: true,
      },
      orderBy: [{ dueDate: "asc" }, { nextDueDate: "asc" }, { createdAt: "asc" }],
    })]);

  const title = formatVehicleTitle(vehicle);
  const secondaryAssets = vehicleAssets.filter((asset) => asset.id !== vehicle.primaryAssetId);
  const tasks = uniqueBy(rawTasks, (task) => task.id);
    return (
    <main className="container py-8">
      <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>{title}</h1>
          {vehicle.vin ? (
            <p className="text-muted-foreground" style={{ marginTop: 4 }}>
              VIN: {vehicle.vin}
            </p>
          ) : null}
          {vehicle.primaryAssetId ? (
            <p className="text-muted-foreground" style={{ marginTop: 4 }}>
              Asset record: <Link href={`/assets/${vehicle.primaryAssetId}`}>View asset</Link>
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <Link href={`/vehicles/${vehicle.id}/edit`} className="btn btn-outline">Edit</Link>
          <Link href="/vehicles" className="btn btn-outline">Back</Link>
        </div>
      </div>

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <div className="card-title">Maintenance Tasks</div>
          <div className="card-description">Tasks scheduled directly for this vehicle.</div>
        </div>
        <div className="card-content" style={{ padding: 0 }}>
          {tasks.length === 0 ? (
            <div className="text-muted-foreground" style={{ padding: "1rem" }}>
              No vehicle-level tasks yet.
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

      {vehicle.primaryAssetId ? (
        <AttachmentsPanel
          targetType="asset"
          targetId={vehicle.primaryAssetId}
          heading="Documents"
          description="Attach invoices, inspection reports, and other paperwork for this vehicle."
        />
      ) : null}
    </main>
  );
}

