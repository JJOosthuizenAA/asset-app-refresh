// src/app/api/maintenance/[taskId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, context: any) {
    const { taskId } = context.params as { taskId: string };
    const body = await req.json();

    // Special action: mark complete
    if (body?.action === "complete") {
        // We can’t compute a “next” date because the schema has no frequency field.
        // Minimal, schema-consistent behavior: mark completed = true.
        const task = await prisma.maintenanceTask.update({
            where: { id: taskId },
            data: { completed: true },
        });
        return NextResponse.json({ task });
    }

    // Regular PATCH payload (only update fields that exist in the schema)
    const { title, notes, dueDate, completed } = body ?? {};

    const task = await prisma.maintenanceTask.update({
        where: { id: taskId },
        data: {
            ...(title !== undefined && { title: String(title) }),
            ...(notes !== undefined && { notes: notes ? String(notes) : null }),
            ...(dueDate !== undefined && {
                dueDate: dueDate ? new Date(dueDate) : null,
            }),
            ...(completed !== undefined && { completed: Boolean(completed) }),
        },
    });

    return NextResponse.json({ task });
}

export async function DELETE(_req: Request, context: any) {
    const { taskId } = context.params as { taskId: string };
    await prisma.maintenanceTask.delete({ where: { id: taskId } });
    return NextResponse.json({ ok: true });
}

