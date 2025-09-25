// src/app/signout/page.tsx
"use client";

import { signOut } from "next-auth/react";

export default function SignOutPage() {
    return (
        <div className="mx-auto w-full max-w-sm py-12">
            <h1 className="mb-6 text-2xl font-semibold">Sign out</h1>
            <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
                Sign out
            </button>
        </div>
    );
}
