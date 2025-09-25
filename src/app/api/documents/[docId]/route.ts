// src/app/api/documents/[docId]/route.ts
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";

export async function DELETE(_req: Request, context: { params: { docId: string } }) {
  const accountId = await requireAccountId();
  const { docId } = context.params;

  const document = await prisma.document.findUnique({
    where: { id: docId },
    select: { id: true, accountId: true, deletedAt: true },
  });

  if (!document || document.accountId !== accountId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (document.deletedAt) {
    return NextResponse.json({ ok: true });
  }

  await prisma.document.update({
    where: { id: docId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
