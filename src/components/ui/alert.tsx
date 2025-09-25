import * as React from "react";
import clsx from "clsx";

type AlertVariant = "success" | "warning" | "error" | "info";

export function Alert({
 variant = "info",
 title,
 children,
 className,
}: {
 variant?: AlertVariant;
 title?: string;
 children?: React.ReactNode;
 className?: string;
}) {
 const styles: Record<AlertVariant, string> = {
 success: "bg-[color:var(--alert-success-bg)] text-[color:var(--alert-success-tx)]",
 warning: "bg-[color:var(--alert-warning-bg)] text-[color:var(--alert-warning-tx)]",
 error: "bg-[color:var(--alert-error-bg)] text-[color:var(--alert-error-tx)]",
 info: "bg-surface text-[color:var(--foreground)] border-border-[color:var(--border)]",
 };

 return (
 <div className={clsx("rounded-lg p-4", styles[variant], className)}>
 {title && <div className="mb-1 font-semibold">{title}</div>}
 <div className="text-sm opacity-90">{children}</div>
 </div>
 );
}
