// src/components/layout/AppShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/properties", label: "Properties" },
    { href: "/vehicles", label: "Vehicles" },
    { href: "/personal", label: "Personal" },
    { href: "/other", label: "Other" },
    { href: "/assets", label: "Assets" },
    { href: "/tasks", label: "Tasks" },
    { href: "/warranties", label: "Warranties" },
    { href: "/logs", label: "Activity" },
];

function isActive(pathname: string, href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const { status } = useSession(); // "authenticated" | "unauthenticated" | "loading"
    const authed = status === "authenticated";

    return (
        <div className="min-h-dvh bg-background text-text">
            {/* Brand accent bar */}
            <div className="h-1 bg-brand" />

            {/* Header (sticky) */}
            <header className="sticky top-0 z-50 bg-surface/95 border-b border-border backdrop-blur supports-[backdrop-filter]:bg-surface/75">
                <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 rounded bg-brand px-3 py-2 text-white"
                >
                    Skip to content
                </a>

                <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-8">
                        <Link href="/" className="font-semibold text-lg">
                            Household Asset Manager
                        </Link>

                        {/* Desktop nav (only when signed in) */}
                        {authed && (
                            <nav className="hidden md:flex items-center gap-2">
                                {nav.map((item) => {
                                    const active = isActive(pathname, item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            aria-current={active ? "page" : undefined}
                                            className={clsx(
                                                "px-3 py-2 rounded-md text-sm transition-colors",
                                                active
                                                    ? "bg-[#E3F2FD] text-[color:var(--brand-500)]"
                                                    : "text-text hover:underline hover:decoration-[color:var(--brand-500)] underline-offset-4"
                                            )}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Auth button */}
                        {authed ? (
                            <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/" })}>
                                Sign Out
                            </Button>
                        ) : (
                            <Button variant="secondary" onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}>
                                Sign In
                            </Button>
                        )}

                        {/* Mobile menu button (only useful when signed in) */}
                        {authed && (
                            <button
                                className="md:hidden rounded-lg border border-border bg-surface p-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-500)]"
                                aria-label="Toggle menu"
                                aria-expanded={open}
                                onClick={() => setOpen((v) => !v)}
                            >
                                <span className="block h-0.5 w-5 bg-text mb-1" />
                                <span className="block h-0.5 w-5 bg-text mb-1" />
                                <span className="block h-0.5 w-5 bg-text" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile nav (only when signed in) */}
                {authed && open ? (
                    <div className="md:hidden border-t border-border bg-surface">
                        <nav className="mx-auto max-w-6xl px-4 py-2 flex flex-col gap-1">
                            {nav.map((item) => {
                                const active = isActive(pathname, item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        aria-current={active ? "page" : undefined}
                                        className={clsx(
                                            "px-3 py-2 rounded-md text-sm transition-colors",
                                            active
                                                ? "bg-[#E3F2FD] text-[color:var(--brand-500)]"
                                                : "text-text hover:bg-background"
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                            <Button
                                variant="secondary"
                                className="w-full mt-1"
                                onClick={() => {
                                    setOpen(false);
                                    signOut({ callbackUrl: "/" });
                                }}
                            >
                                Sign Out
                            </Button>
                        </nav>
                    </div>
                ) : null}
            </header>

            {/* Page container */}
            <main id="main" className="mx-auto max-w-6xl px-4 py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="mt-12 py-8 text-center text-sm text-text-600">
                © {new Date().getFullYear()} Household Asset Manager
            </footer>
        </div>
    );
}

