// src/app/signin/signin-client.tsx
"use client";

import { signIn } from "next-auth/react";

export default function SignInButton({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
    return (
        <button
            onClick={() => signIn(undefined, { callbackUrl })}
            className="w-full rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90"
        >
            Continue
        </button>
    );
}
