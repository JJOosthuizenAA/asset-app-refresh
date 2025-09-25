// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";

/**
 * This configuration ensures the JWT & session both carry `accountId`.
 * It tries, in order:
 *  - user.accountId (if your adapter/provider populates it on login)
 *  - the DB user (by email) -> accountId
 *  - if there is exactly one Account in the DB, use that as a fallback
 */
export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt" },

    providers: [
        // Keep your existing providers; here’s a minimal Credentials example:
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                // DEMO-ONLY: accept anything non-empty. Replace with real checks.
                const email = credentials?.email?.trim().toLowerCase();
                if (!email) return null;

                // Look up or create a user (must have accountId in the DB)
                let user = await prisma.user.findUnique({ where: { email } });

                // If user doesn’t exist, try to attach the single account (if only one)
                if (!user) {
                    const onlyAccount = await prisma.account.findFirst({
                        select: { id: true },
                    });

                    user = await prisma.user.create({
                        data: {
                            email,
                            name: email.split("@")[0],
                            // attach an account if we found one; otherwise this will be null
                            accountId: onlyAccount?.id ?? null,
                        },
                    });
                }

                return {
                    id: user.id,
                    name: user.name ?? user.email,
                    email: user.email,
                    // pass through accountId so the jwt callback can pick it up
                    accountId: (user as any).accountId ?? null,
                } as any;
            },
        }),
    ],

    callbacks: {
        // Put accountId onto the token
        async jwt({ token, user }) {
            // Prefer accountId coming from the provider/authorize step
            if (user && (user as any).accountId) {
                (token as any).accountId = (user as any).accountId;
            }

            // If token still has no accountId, look it up from DB user by email
            if (!(token as any).accountId && token.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email },
                    select: { accountId: true },
                });
                if (dbUser?.accountId) {
                    (token as any).accountId = dbUser.accountId;
                }
            }

            // Last-resort fallback: if there is exactly one Account, use it
            if (!(token as any).accountId) {
                const first = await prisma.account.findFirst({ select: { id: true } });
                if (first) (token as any).accountId = first.id;
            }

            return token;
        },

        // Expose accountId on the session so server components can read it
        async session({ session, token }) {
            (session as any).user = (session as any).user || {};
            (session as any).user.accountId = (token as any).accountId ?? null;
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export { authOptions };
