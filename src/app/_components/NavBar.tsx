// src/app/_components/NavBar.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import GearMenu from "./GearMenu";

export default async function NavBar() {
    const accountId = await requireAccountId().catch(() => null);

    const account = accountId
        ? await prisma.account.findUnique({
            where: { id: accountId },
            select: {
                id: true,
                code: true,
                name: true,
                countryCode: true,
                currencyCode: true,
            },
        })
        : null;

    return (
        <header className="navbar">
            <div className="navbar-inner">
                {/* Brand goes to /dashboard */}
                <Link href="/dashboard" className="brand">Asset App</Link>

                {/* Middle nav links */}
                <nav className="nav-links">
                    <Link href="/dashboard" className="link">Dashboard</Link>
                    <Link href="/properties" className="link">Properties</Link>
                    <Link href="/vehicles" className="link">Vehicles</Link>
                    <Link href="/personal" className="link">Personal</Link>
                    <Link href="/other" className="link">Other</Link>
                    <Link href="/assets" className="link">Assets</Link>
                    <Link href="/tasks" className="link">Tasks</Link>
                    <Link href="/warranties" className="link">Warranties</Link>
                </nav>

                {/* Right: ONLY the GearMenu client component */}
                <div className="right" style={{ position: "relative" }}>
                    <GearMenu
                        account={
                            account
                                ? {
                                    name: account.name,
                                    code: account.code,
                                    currencyCode: account.currencyCode,
                                    countryCode: account.countryCode,
                                }
                                : undefined
                        }
                    />
                </div>
            </div>
        </header>
    );
}


