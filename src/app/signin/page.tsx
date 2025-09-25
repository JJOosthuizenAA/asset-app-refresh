// src/app/signin/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import SignInButton from "./signin-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SignInPage({
    searchParams,
}: {
    searchParams?: { callbackUrl?: string };
}) {
    const session = await getServerSession(authOptions);
    if (session) redirect("/dashboard");

    const callbackUrl = searchParams?.callbackUrl ?? "/dashboard";

    return (
        <div className="grid min-h-[calc(100vh-0px)] place-items-center px-6">
            <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
                <h1 className="mb-6 text-center text-2xl font-semibold">Sign in</h1>

                <div className="space-y-4">
                    <SignInButton callbackUrl={callbackUrl} />
                    <p className="text-center text-sm text-muted-foreground">
                        Don’t have an account?{" "}
                        <Link href="/" className="underline">
                            Go back
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
