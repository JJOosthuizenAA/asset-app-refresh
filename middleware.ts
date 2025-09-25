// src/middleware.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: Request & { nextUrl: URL }) {
    const token = await getToken({
        req: req as any,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const { pathname, search } = req.nextUrl;
    const isAuthed = !!token;

    // Pages that require authentication
    const protectedPaths = [
        "/dashboard",
        "/properties",
        "/vehicles",
        "/personal",
        "/other",
        "/assets",
        "/tasks",
        "/warranties",
        "/logs",
        "/settings",
    ];

    // If user is NOT authed and tries to access a protected path -> go to /signin
    if (protectedPaths.some((p) => pathname.startsWith(p)) && !isAuthed) {
        const url = new URL("/signin", req.url);
        // preserve where they were going
        url.searchParams.set("callbackUrl", pathname + (search || ""));
        return NextResponse.redirect(url);
    }

    // If user IS authed and hits the landing or sign-in page -> go to dashboard
    if (isAuthed && (pathname === "/" || pathname === "/signin")) {
        const url = new URL("/dashboard", req.url);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/properties/:path*",
        "/vehicles/:path*",
        "/personal/:path*",
        "/other/:path*",
        "/assets/:path*",
        "/tasks/:path*",
        "/warranties/:path*",
        "/logs/:path*",
        "/settings/:path*",
    ],
};

