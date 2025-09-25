// src/lib/session.ts
import { cookies } from "next/headers";

export type Session = {
    name: string;
};

const COOKIE_NAME = "session";

export function getSession(): Session | null {
    try {
        const raw = cookies().get(COOKIE_NAME)?.value;
        if (!raw) return null;
        const data = JSON.parse(raw) as Session;
        if (!data?.name) return null;
        return data;
    } catch {
        return null;
    }
}

export function serializeSessionCookie(session: Session, days = 7) {
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    return {
        name: COOKIE_NAME,
        value: JSON.stringify(session),
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        expires,
    };
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
