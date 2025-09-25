// src/app/debug/tables/page.tsx
import { prisma } from '../../../lib/db';
export const runtime = 'nodejs';
export default async function DebugTables() {
 const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(
 "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
 );
 return <pre style={{ padding: 16 }}>{JSON.stringify(rows, null, 2)}</pre>;
}
