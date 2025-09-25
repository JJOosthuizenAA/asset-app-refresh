// src/app/assets/[id]/maintenance/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/assets/:id/maintenance
 * List maintenance tasks for an asset, ordered by due date soonest first.
 */
export async function GET(_req: Request, context: any) {
    const { id } = context.params as { id: string };

    const tasks = await prisma.maintenanceTask.findMany({
        where: { assetId: id },
        // FIX: your schema doesn't have `nextDueAt`; use `dueDate` + createdAt
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ tasks });
}

/**
 * POST /api/assets/:id/maintenance
 * Create a maintenance task. Accepts form-data or JSON:
 * - title (required)
 * - dueDate (optional, ISO yyyy-mm-dd or ISO timestamp)
 * - notes (optional)
 */
export async function POST(req: Request, context: any) {
    const { id } = context.params as { id: string };

    // Support both multipart/form-data and JSON
    let title: string | undefined;
    let notes: string | undefined | null;
    let dueDate: Date | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        title = (form.get("title") as string | null) ?? undefined;
        const due = (form.get("dueDate") as string | null) ?? null;
        notes = ((form.get("notes") as string | null)?.trim() || "") || null;
        if (due) {
            const d = new Date(due);
            if (!Number.isNaN(d.valueOf())) dueDate = d;
        }
    } else {
        const body = await req.json().catch(() => ({} as any));
        title = typeof body?.title === "string" ? body.title : undefined;
        notes =
            typeof body?.notes === "string"
                ? body.notes.trim() || null
                : body?.notes === null
                    ? null
                    : undefined;
        if (typeof body?.dueDate === "string") {
            const d = new Date(body.dueDate);
            if (!Number.isNaN(d.valueOf())) dueDate = d;
        }
    }

    if (!title || !title.trim()) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await prisma.maintenanceTask.create({
        data: {
            assetId: id,
            title: title.trim(),
            notes: notes ?? null,
            dueDate, // may be null
            completed: false,
        },
    });

    return NextResponse.json({ task }, { status: 201 });
}


