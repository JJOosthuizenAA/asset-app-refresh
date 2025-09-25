// src/app/_components/AppHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/properties", label: "Properties" },
    { href: "/vehicles", label: "Vehicles" },
    { href: "/personal", label: "Personal" },
    { href: "/other", label: "Other" },
    { href: "/assets", label: "Assets" },
    { href: "/tasks", label: "Tasks" },
    { href: "/warranties", label: "Warranties" },
];

function NavLink({ href, label }: { href: string; label: string }) {
    const pathname = usePathname();
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
        <Link
            href={href}
            className={[
                "rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100",
            ].join(" ")}
        >
            {label}
        </Link>
    );
}

export default function AppHeader() {
    const [open, setOpen] = useState(false);
    return (
        <header className="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
                <Link href="/" className="font-semibold tracking-tight">
                    Asset App
                </Link>

                {/* Desktop nav */}
                <nav className="hidden items-center gap-1 md:flex">
                    {NAV.map((item) => (
                        <NavLink key={item.href} {...item} />
                    ))}
                </nav>

                {/* Mobile */}
                <button
                    className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm md:hidden"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Toggle menu"
                >
                    Menu
                </button>
            </div>

            {/* Mobile sheet */}
            {open && (
                <div className="border-t bg-white md:hidden">
                    <nav className="mx-auto grid max-w-6xl gap-1 px-4 py-3 sm:px-6">
                        {NAV.map((item) => (
                            <NavLink key={item.href} {...item} />
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}

