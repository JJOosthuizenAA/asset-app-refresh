// src/app/api/documents/route.ts
import { NextResponse } from "next/server";
import { DocumentCategory, ParentType } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { saveUploadedFile } from "@/lib/storage";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

function parseCategory(input: string | null): DocumentCategory {
  if (!input) return DocumentCategory.Other;
  const normalized = input.toUpperCase().replace(/[^A-Z_]/g, "");
  const match = (Object.values(DocumentCategory) as string[]).find((value) => value.toUpperCase() === normalized);
  return (match as DocumentCategory) ?? DocumentCategory.Other;
}

function serializeDocument(doc: any) {
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    documentDate: doc.documentDate ? doc.documentDate.toISOString() : null,
    fileUrl: doc.filePath,
    fileSize: doc.fileSize,
    contentType: doc.contentType,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function buildQuery(accountId: string, targetType: string, targetId: string) {
  const where: any = { accountId, deletedAt: null };
  switch (targetType) {
    case "asset": {
      where.assetId = targetId;
      break;
    }
    case "property": {
      where.parentType = ParentType.Property;
      where.parentId = targetId;
      break;
    }
    case "task": {
      where.taskId = targetId;
      break;
    }
    case "warranty": {
      where.warrantyId = targetId;
      break;
    }
    default:
      throw new Error("Unsupported target type");
  }
  return where;
}

export async function GET(req: Request) {
  const accountId = await requireAccountId();
  const url = new URL(req.url);
  const targetType = url.searchParams.get("targetType")?.toLowerCase();
  const targetId = url.searchParams.get("targetId")?.trim();

  if (!targetType || !targetId) {
    return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
  }

  try {
    const where = buildQuery(accountId, targetType, targetId);
    const documents = await prisma.document.findMany({
      where,
      orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ documents: documents.map(serializeDocument) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unsupported target type") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("GET /api/documents error", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

async function assertOwnership(accountId: string, targetType: string, targetId: string) {
  switch (targetType) {
    case "asset": {
      const asset = await prisma.asset.findFirst({ where: { id: targetId, accountId }, select: { id: true } });
      if (!asset) throw new Error("Asset not found");
      return { assetId: targetId };
    }
    case "property": {
      const property = await prisma.property.findFirst({ where: { id: targetId, accountId }, select: { id: true } });
      if (!property) throw new Error("Property not found");
      return { parentType: ParentType.Property, parentId: targetId };
    }
    case "task": {
      const task = await prisma.maintenanceTask.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          asset: { select: { accountId: true } },
          parentType: true,
          parentId: true,
        },
      });
      if (!task) throw new Error("Task not found");
      let ownerAccountId: string | null = task.asset?.accountId ?? null;
      if (!ownerAccountId && task.parentType && task.parentId) {
        switch (task.parentType) {
          case ParentType.Property: {
            const property = await prisma.property.findFirst({ where: { id: task.parentId, accountId }, select: { id: true } });
            if (property) ownerAccountId = accountId;
            break;
          }
          case ParentType.Vehicle: {
            const vehicle = await prisma.vehicle.findFirst({ where: { id: task.parentId, accountId }, select: { id: true } });
            if (vehicle) ownerAccountId = accountId;
            break;
          }
          case ParentType.PersonContainer: {
            const person = await prisma.personContainer.findFirst({ where: { id: task.parentId, accountId }, select: { id: true } });
            if (person) ownerAccountId = accountId;
            break;
          }
          case ParentType.OtherContainer: {
            const other = await prisma.otherContainer.findFirst({ where: { id: task.parentId, accountId }, select: { id: true } });
            if (other) ownerAccountId = accountId;
            break;
          }
        }
      }
      if (ownerAccountId !== accountId) throw new Error("Task not found");
      return { taskId: targetId };
    }
    case "warranty": {
      const warranty = await prisma.warranty.findFirst({
        where: { id: targetId, asset: { accountId } },
        select: { id: true },
      });
      if (!warranty) throw new Error("Warranty not found");
      return { warrantyId: targetId };
    }
    default:
      throw new Error("Unsupported target type");
  }
}

export async function POST(req: Request) {
  const accountId = await requireAccountId();
  const form = await req.formData();

  const targetType = String(form.get("targetType") || "").trim().toLowerCase();
  const targetId = String(form.get("targetId") || "").trim();
  const category = parseCategory((form.get("category") as string) ?? null);
  const titleInput = (form.get("title") as string | null)?.trim();
  const description = (form.get("description") as string | null)?.trim() || null;
  const documentDateInput = (form.get("documentDate") as string | null)?.trim();
  const file = form.get("file");

  if (!targetType || !targetId) {
    return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File upload is required" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
  }

  let documentDate: Date | null = null;
  if (documentDateInput) {
    const parsed = new Date(documentDateInput);
    if (!Number.isFinite(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid document date" }, { status: 400 });
    }
    documentDate = parsed;
  }

  try {
    const targetKeys = await assertOwnership(accountId, targetType, targetId);

    const saved = await saveUploadedFile(file, `documents/${targetType}/${targetId}`);
    const title = titleInput || saved.originalName || file.name || "Uploaded document";

    const document = await prisma.document.create({
      data: {
        accountId,
        title,
        description,
        category,
        documentDate,
        filePath: saved.url,
        fileSize: saved.size ?? file.size,
        contentType: saved.contentType ?? file.type ?? null,
        originalName: saved.originalName ?? file.name,
        ...targetKeys,
      },
    });

    return NextResponse.json({ document: serializeDocument(document) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unsupported target type") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.endsWith("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error("POST /api/documents error", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
