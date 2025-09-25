// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, User } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            /** Custom: single account id tied to this user */
            accountId?: string | null;
        } & DefaultSession["user"];
    }

    interface User {
        /** Custom: single account id tied to this user */
        accountId?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        /** Custom: single account id tied to this user */
        accountId?: string | null;
    }
}
