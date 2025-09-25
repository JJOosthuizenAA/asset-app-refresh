"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: number; title: string; description?: string; kind?: "success" | "error" | "info" };
type Ctx = {
 push: (t: Omit<Toast, "id">) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
 const [items, setItems] = useState<Toast[]>([]);

 const push = useCallback((t: Omit<Toast, "id">) => {
 const id = Date.now() + Math.floor(Math.random() * 1000);
 setItems((prev) => [...prev, { id, ...t }]);
 // auto-dismiss after 4s
 setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4000);
 }, []);

 const ctx = useMemo<Ctx>(() => ({ push }), [push]);

 return (
 <ToastCtx.Provider value={ctx}>
 {children}
 {/* container */}
 <div className="fixed bottom-4 right-4 z-50 space-y-2">
 {items.map((t) => (
 <div
 key={t.id}
 className={[
 "min-w-[260px] max-w-[360px] rounded-lg border-border px-4 py-3 shadow",
 t.kind === "success" && "border-green-300 bg-green-50 text-green-800",
 t.kind === "error" && "border-red-300 bg-red-50 text-red-700",
 (!t.kind || t.kind === "info") && "border-border bg-surface text-text",
 ].filter(Boolean).join(" ")}
 >
 <div className="text-sm font-semibold">{t.title}</div>
 {t.description && <div className="mt-1 text-xs opacity-90">{t.description}</div>}
 </div>
 ))}
 </div>
 </ToastCtx.Provider>
 );
}

export function useToast() {
 const ctx = useContext(ToastCtx);
 if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
 return ctx;
}
