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
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-10 px-6">
                <div className="space-y-3 text-center">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        Secure demo access
                    </span>
                    <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
                    <p className="text-sm text-muted-foreground">
                        Sign in to manage every asset, warranty, and task from a single command center.
                    </p>
                </div>

                <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg shadow-slate-200/50">
                    <div className="space-y-6">
                        <SignInButton callbackUrl={callbackUrl} />

                        <ul className="space-y-2 text-left text-sm text-muted-foreground">
                            <li className="flex gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                Review asset records in seconds.
                            </li>
                            <li className="flex gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                Track warranties and expirations automatically.
                            </li>
                            <li className="flex gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                Coordinate maintenance tasks with your team.
                            </li>
                        </ul>

                        <p className="text-center text-sm text-muted-foreground">
                            Need to switch accounts?{" "}
                            <Link href="/signout" className="underline">
                                Sign out first
                            </Link>
                            .
                        </p>
                    </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                    Don't have credentials yet?{" "}
                    <Link href="/" className="underline">
                        Request demo access
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
}
