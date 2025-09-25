// src/app/other/page.tsx
import Link from "next/link";
import { ParentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OtherContainersPage() {
  const accountId = await requireAccountId();

  const containers = await prisma.otherContainer.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      notes: true,
      createdAt: true,
    },
  });

  const containerIds = containers.map((c) => c.id);

  const [assetCounts, taskCounts, documentCounts] = await Promise.all([
    containerIds.length
      ? prisma.asset.groupBy({
          by: ["parentId"],
          where: { parentType: ParentType.OtherContainer, parentId: { in: containerIds } },
          _count: { parentId: true },
        })
      : Promise.resolve([]),
    containerIds.length
      ? prisma.maintenanceTask.groupBy({
          by: ["parentId"],
          where: { parentType: ParentType.OtherContainer, parentId: { in: containerIds } },
          _count: { parentId: true },
        })
      : Promise.resolve([]),
    containerIds.length
      ? prisma.document.groupBy({
          by: ["parentId"],
          where: { parentType: ParentType.OtherContainer, parentId: { in: containerIds } },
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
        <h1>Other Containers</h1>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <Link href="/other/new" className="btn btn-primary">New Other Container</Link>
        </div>
      </div>

      {containers.length === 0 ? (
        <section className="card">
          <div className="card-content">
            <p className="text-muted-foreground" style={{ marginBottom: 8 }}>
              You don&apos;t have any other containers yet.
            </p>
            <Link href="/other/new" className="btn btn-primary">Create your first container</Link>
          </div>
        </section>
      ) : (
        <section className="card">
          <div className="card-content" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Label</th>
                  <th style={{ width: "38%" }}>Notes</th>
                  <th style={{ width: "8%", textAlign: "right" }}>Assets</th>
                  <th style={{ width: "6%", textAlign: "right" }}>Tasks</th>
                  <th style={{ width: "6%", textAlign: "right" }}>Docs</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((container) => {
                  const assets = assetCountMap.get(container.id) ?? 0;
                  const tasks = taskCountMap.get(container.id) ?? 0;
                  const documents = documentCountMap.get(container.id) ?? 0;

                  return (
                    <tr key={container.id}>
                      <td>
                        <Link href={`/other/${container.id}`}>{container.label}</Link>
                      </td>
                      <td>
                        <span className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                          {container.notes ? container.notes.slice(0, 80) : "--"}
                          {container.notes && container.notes.length > 80 ? "..." : ""}
                        </span>
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

