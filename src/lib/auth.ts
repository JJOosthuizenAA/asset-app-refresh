// src/lib/auth.ts
import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";

async function getDefaultAccountId(): Promise<string> {
    const account = await prisma.account.findFirst({
        select: { id: true },
        orderBy: { createdAt: "asc" },
    });
    return account?.id ?? "DEMO-ACCOUNT";
}

async function ensureValidAccountId(candidate?: string | null): Promise<string> {
    if (candidate) {
        const exists = await prisma.account.findUnique({ where: { id: candidate }, select: { id: true } });
        if (exists) return candidate;
    }
    return getDefaultAccountId();
}

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: "jwt" },
    providers: [
        CredentialsProvider({
            name: "Sign in",
            credentials: {
                username: { label: "Name", type: "text", placeholder: "your name" },
                password: { label: "Password", type: "password", placeholder: "demo" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;
                if (credentials.password !== "demo") return null;

                const accountId = await getDefaultAccountId();

                const u: User & { accountId?: string } = {
                    id: "demo-user",
                    name: credentials.username,
                    email: `${credentials.username.toLowerCase().replace(/\s+/g, ".")}@local`,
                    accountId,
                };
                return u;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.name = user.name ?? token.name;
                token.email = user.email ?? token.email;
                // @ts-ignore custom field from authorize
                token.accountId = (user as any).accountId ?? token.accountId;
            }

            // @ts-ignore ensure token carries a valid account id
            token.accountId = await ensureValidAccountId((token as any).accountId);
            return token;
        },
        async session({ session, token }) {
            if (!session.user) session.user = {};
            session.user.name = token.name ?? session.user.name ?? undefined;
            session.user.email = token.email ?? session.user.email ?? undefined;
            // @ts-ignore expose accountId to client
            session.user.accountId = await ensureValidAccountId((token as any).accountId);
            return session;
        },
    },
    pages: {
        signIn: "/signin",
    },
};
