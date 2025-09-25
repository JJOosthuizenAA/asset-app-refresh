// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import NavBar from "./_components/NavBar";

export const metadata: Metadata = {
    title: "Asset App",
    description: "Manage assets, warranties, and tasks",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    {/* Top navigation with gear/account menu */}
                    <NavBar />

                    {/* Main page content */}
                    <main className="container py-8">
                        {children}
                    </main>

                    {/* Footer */}
                    <footer style={{ borderTop: "1px solid #cbd5e1", background: "#fff" }}>
                        <div className="container" style={{ padding: "1rem 1rem", fontSize: ".75rem" }}>
                            © {new Date().getFullYear()} Asset App
                        </div>
                    </footer>
                </Providers>
            </body>
        </html>
    );
}
