// src/components/AppHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { clsx } from "clsx";

function NavLink({
    href,
    children,
    exact = false,
}: {
    href: string;
    children: React.ReactNode;
    exact?: boolean;
}) {
    const pathname = usePathname();
    const isActive = exact
        ? pathname === href
        : pathname === href || pathname.startsWith(href + "/");
    return (
        <Link
            href={href}
            className={clsx("hover:underline", isActive && "font-semibold underline")}
        >
            {children}
        </Link>
    );
}

export default function AppHeader() {
    return (
        <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
            <Link href="/" className="text-lg font-semibold">
                Asset Manager
            </Link>

            <nav className="flex items-center gap-4">
                <NavLink href="/dashboard" exact>Dashboard</NavLink>
                <NavLink href="/properties">Properties</NavLink>
                <NavLink href="/vehicles">Vehicles</NavLink>
                <NavLink href="/personal">Personal</NavLink>
                <NavLink href="/other">Other</NavLink>
                <NavLink href="/assets">Assets</NavLink>
                <NavLink href="/tasks">Tasks</NavLink>
                <NavLink href="/warranties">Warranties</NavLink>

                <Link
                    href="/settings/account"
                    aria-label="Account Settings"
                    className="p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Account Settings"
                >
                    <Settings className="h-5 w-5" />
                </Link>

                <Link
                    href="/api/auth/signout?callbackUrl=/"
                    className="flex items-center gap-1 rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                </Link>
            </nav>
        </header>
    );
}








