// src/app/_components/GearMenu.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type AccountLite = {
    name: string | null;
    code: string;
    currencyCode: string | null;
    countryCode: string | null;
};

export default function GearMenu({ account }: { account?: AccountLite }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Close on click-outside & Escape
    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            const t = e.target as Node;
            if (wrapRef.current && !wrapRef.current.contains(t)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // Whenever the route changes, ensure panel is closed
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // Extra guard: if we're on any /settings route, force closed
    useEffect(() => {
        if (pathname.startsWith("/settings") && open) {
            setOpen(false);
        }
    }, [pathname, open]);

    const goToSettings = () => {
        // Close immediately regardless of current route
        setOpen(false);
        // Let state flush, then navigate (works even if already on /settings)
        setTimeout(() => {
            if (!pathname.startsWith("/settings")) {
                router.push("/settings");
            } else {
                // Already on /settings; no nav but panel is now closed
                // Optionally focus the page title for good UX:
                const h1 = document.querySelector("h1") as HTMLElement | null;
                h1?.focus?.();
            }
        }, 0);
    };

    return (
        <div ref={wrapRef} className="relative">
            {/* Gear button */}
            <button
                type="button"
                className="btn btn-ghost gear-btn"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(v => !v)}
                title="Settings"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.14,12.94a7.52,7.52,0,0,0,.05-.94,7.52,7.52,0,0,0-.05-.94l2.11-1.65a.5.5,0,0,0,.12-.65l-2-3.46a.5.5,0,0,0-.61-.22l-2.49,1a7.28,7.28,0,0,0-1.63-.94l-.38-2.65A.5.5,0,0,0,13.18,2H10.82a.5.5,0,0,0-.5.42L9.94,5.07a7.28,7.28,0,0,0-1.63.94l-2.49-1a.5.5,0,0,0-.61.22l-2,3.46a.5.5,0,0,0,.12.65L5.46,11.06a7.52,7.52,0,0,0-.05.94,7.52,7.52,0,0,0,.05.94L3.35,14.59a.5.5,0,0,0-.12.65l2,3.46a.5.5,0,0,0,.61.22l2.49-1a7.28,7.28,0,0,0,1.63.94l.38,2.65a.5.5,0,0,0,.5.42h2.36a.5.5,0,0,0,.5-.42l.38-2.65a7.28,7.28,0,0,0,1.63-.94l2.49,1a.5.5,0,0,0,.61-.22l2-3.46a.5.5,0,0,0-.12-.65ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
                </svg>
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="card shadow-md"
                    style={{
                        position: "absolute",
                        right: 0,
                        top: "2.5rem",
                        zIndex: 2000,
                        minWidth: 300,
                        overflow: "visible",
                    }}
                    role="dialog"
                    aria-label="Account"
                >
                    <div
                        className="card-header"
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    >
                        <div className="card-title">Account</div>
                        {/* Close (X) */}
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => setOpen(false)}
                            aria-label="Close"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="card-content">
                        {account ? (
                            <div className="grid" style={{ gap: ".5rem" }}>
                                <div>
                                    <div className="text-xs text-muted-foreground">Name</div>
                                    <div className="font-medium">{account.name ?? "—"}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Code</div>
                                    <div className="font-mono">{account.code}</div>
                                </div>

                                <div className="grid grid-2">
                                    <div>
                                        <div className="text-xs text-muted-foreground">Currency</div>
                                        <div>{account.currencyCode ?? "—"}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Country</div>
                                        <div>{account.countryCode ?? "—"}</div>
                                    </div>
                                </div>

                                {/* Configuration: close panel, then navigate */}
                                <div style={{ marginTop: ".5rem" }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline w-full"
                                        onClick={goToSettings}
                                    >
                                        Configuration
                                    </button>
                                </div>

                                {/* Footer actions */}
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: ".75rem" }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setOpen(false)}
                                    >
                                        Close
                                    </button>

                                    <form action="/api/auth/signout" method="post">
                                        <button type="submit" className="btn btn-danger">Sign out</button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className="text-muted-foreground">No account selected.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
