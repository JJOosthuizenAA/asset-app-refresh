// src/app/personal/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ParentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { dateOrDash } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PersonalContainerDetailPage({ params }: { params: { id: string } }) {
  const accountId = await requireAccountId();
  const container = await prisma.personContainer.findFirst({
    where: { id: params.id, accountId },
    select: {
      id: true,
      label: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!container) {
    notFound();
  }

  const [assets, tasks, documents] = await Promise.all([
    prisma.asset.findMany({
      where: { parentType: ParentType.PersonContainer, parentId: container.id },
      select: { id: true, name: true, assetType: true, status: true, purchaseDate: true },
      orderBy: { name: "asc" },
    }),
    prisma.maintenanceTask.findMany({
      where: { parentType: ParentType.PersonContainer, parentId: container.id },
      select: { id: true, title: true, dueDate: true, completed: true, isRecurring: true, nextDueDate: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.document.findMany({
      where: { parentType: ParentType.PersonContainer, parentId: container.id },
      select: { id: true, title: true, description: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="container py-8">
      <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>{container.label}</h1>
          <p className="text-muted-foreground" style={{ marginTop: 4 }}>
            Created {dateOrDash(container.createdAt)}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <Link href={`/personal/${container.id}/edit`} className="btn btn-outline">Edit</Link>
          <Link href="/personal" className="btn btn-outline">Back</Link>
        </div>
      </div>

      {container.notes ? (
        <section className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <div className="card-title">Notes</div>
          </div>
          <div className="card-content">
            <div style={{ whiteSpace: "pre-wrap" }}>{container.notes}</div>
          </div>
        </section>
      ) : null}

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header">
          <div className="card-title">Assets</div>
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
          <div className="card-title">Tasks</div>
        </div>
        <div className="card-content" style={{ padding: 0 }}>
          {tasks.length === 0 ? (
            <div className="text-muted-foreground" style={{ padding: "1rem" }}>
              No personal tasks yet.
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







