// src/lib/current-account.ts
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Returns the current user's accountId.
 * - If not signed in → redirects to /signin
 * - If session has accountId → returns it
 * - If there is exactly ONE account in DB → returns that (single-account fallback)
 * - Otherwise throws (no link / ambiguous)
 */
export async function requireAccountId(): Promise<string> {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/signin");
    }

    const accountId = (session as any)?.user?.accountId as string | undefined;
    if (accountId) return accountId;

    // Single-account fallback: if your app only ever has one account, use it.
    const accounts = await prisma.account.findMany({ select: { id: true }, take: 2 });
    if (accounts.length === 1) return accounts[0].id;

    throw new Error("No account linked to the current user.");
}

/** Returns accountId from session if present, otherwise undefined. */
export async function optionalAccountId(): Promise<string | undefined> {
    const session = await getServerSession(authOptions);
    return (session as any)?.user?.accountId as string | undefined;
}
