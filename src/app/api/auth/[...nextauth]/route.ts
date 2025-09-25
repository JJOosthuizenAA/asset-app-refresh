// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
    session: { strategy: "jwt" },

    providers: [
        Credentials({
            name: "Dev Login",
            credentials: {
                email: { label: "Email", type: "text" },
                username: { label: "Username", type: "text" }
            },
            async authorize(credentials) {
                const raw = (credentials?.email ?? credentials?.username ?? "").toString().trim();
                const email = raw || "dev@example.com";
                const name = email.includes("@") ? email.split("@")[0] : email;
                return { id: email, email, name }; // dev-friendly: always accept
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (token?.email) {
                session.user = { ...session.user, email: token.email as string, name: token.name as string };
            }
            return session;
        },
    },
});

export { handler as GET, handler as POST };

