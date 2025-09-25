// src/lib/auth.ts
import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * DEV-ONLY: simple credential auth
 * - Any username allowed
 * - Password must be "demo"
 * - Ties user to a single accountId for the app (e.g., DEMO-ACCOUNT)
 *
 * If you later add a proper User table, swap the authorize() to look up the user.
 */

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
                // Basic guard
                if (!credentials?.username || !credentials?.password) return null;

                // DEV password check
                if (credentials.password !== "demo") return null;

                // Return a minimal user object (no DB needed)
                const u: User & { accountId?: string } = {
                    id: "demo-user",
                    name: credentials.username,
                    email: `${credentials.username.toLowerCase().replace(/\s+/g, ".")}@local`,
                    // Tie to your single-account design. If you seeded DEMO-ACCOUNT, use that ID:
                    // Change this if your real account id differs.
                    accountId: "DEMO-ACCOUNT",
                };
                return u;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Attach our custom fields on initial sign-in
            if (user) {
                token.name = user.name ?? token.name;
                token.email = user.email ?? token.email;
                // @ts-ignore custom field
                token.accountId = (user as any).accountId ?? "DEMO-ACCOUNT";
            }
            return token;
        },
        async session({ session, token }) {
            // Surface fields into session
            if (!session.user) session.user = {};
            session.user.name = token.name ?? session.user.name ?? undefined;
            session.user.email = token.email ?? session.user.email ?? undefined;
            // @ts-ignore custom field
            session.user.accountId = (token as any).accountId ?? "DEMO-ACCOUNT";
            return session;
        },
    },
    pages: {
        signIn: "/signin",
    },
};
