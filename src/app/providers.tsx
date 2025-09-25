"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
    // You can pass session={pageProps.session} if you ever use pages router.
    return <SessionProvider>{children}</SessionProvider>;
}
