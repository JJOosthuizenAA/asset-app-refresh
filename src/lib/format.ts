// src/lib/format.ts

// Safely format money-like values (number | string | Prisma.Decimal | null)
export function fmtMoney(v: unknown): string {
    if (v == null) return "--";
    // Prisma.Decimal serializes to string in JSON; also handle plain strings
    const n =
        typeof v === "string"
            ? Number(v)
            : typeof v === "number"
            ? v
            : Number((v as any)?.toString?.() ?? NaN);
    return Number.isFinite(n) ? n.toFixed(2) : "--";
}

// Format a date or return a double dash when missing
export function dateOrDash(d?: Date | string | null): string {
    if (!d) return "--";
    const dt = typeof d === "string" ? new Date(d) : d;
    return Number.isNaN(dt?.valueOf?.() ?? NaN) ? "--" : dt.toLocaleDateString();
}

// Optional: clamp empty strings to null before saving numbers
export function toNumberOrNull(input: unknown): number | null {
    const s = typeof input === "string" ? input.trim() : String(input ?? "");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

// Optional: safe ISO (YYYY-MM-DD) for <input type="date">
export function toISODateOrEmpty(d?: Date | string | null): string {
    if (!d) return "";
    const dt = typeof d === "string" ? new Date(d) : d;
    return Number.isNaN(dt?.valueOf?.() ?? NaN) ? "" : dt.toISOString().slice(0, 10);
}