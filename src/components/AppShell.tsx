// src/components/AppShell.tsx
"use client";

import { usePathname } from "next/navigation";
import AppHeader from "@/components/AppHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Hide header on landing and auth-related routes
    const noHeader =
        pathname === "/" ||
        pathname?.startsWith("/auth") ||
        pathname?.startsWith("/api/auth");

    return (
        <>
            {!noHeader && <AppHeader />}
            <main className={noHeader ? "" : "p-6"}>{children}</main>
        </>
    );
}
