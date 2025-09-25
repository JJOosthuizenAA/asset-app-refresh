// src/app/settings/page.tsx
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SettingsIndex() {
    return (
        <main className="container py-8">
            <h1>Configuration</h1>
            <div className="grid" style={{ gap: "1rem", marginTop: "1rem" }}>
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Account</div>
                    </div>
                    <div className="card-content">
                        <p className="text-muted-foreground" style={{ marginBottom: ".75rem" }}>
                            Manage the workspace name, default country, and currency.
                        </p>
                        <Link href="/settings/account" className="btn btn-outline">Open</Link>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Dashboard</div>
                    </div>
                    <div className="card-content">
                        <p className="text-muted-foreground" style={{ marginBottom: ".75rem" }}>
                            Control time windows for expiring warranties and due/overdue tasks.
                        </p>
                        <Link href="/settings/dashboard" className="btn btn-outline">Open</Link>
                    </div>
                </div>

                {/* Future: add more config areas here (e.g., Notifications, UI, Reminders) */}
            </div>
        </main>
    );
}
