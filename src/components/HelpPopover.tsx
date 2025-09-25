"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

type HelpPopoverProps = {
    title?: string;
    children: React.ReactNode;
    className?: string;
};

export default function HelpPopover({ title = "Need help?", children, className }: HelpPopoverProps) {
    const [open, setOpen] = useState(false);
    const popoverId = useId();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const containerClass = ["help-popover", className].filter(Boolean).join(" ");

    useEffect(() => {
        if (!open) return;

        function handlePointerDown(event: PointerEvent) {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        window.addEventListener("pointerdown", handlePointerDown);
        return () => window.removeEventListener("pointerdown", handlePointerDown);
    }, [open]);

    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "Escape") {
            setOpen(false);
        }
    }

    return (
        <div ref={containerRef} className={containerClass}>
            <button
                type="button"
                aria-expanded={open}
                aria-controls={popoverId}
                className="help-popover__trigger"
                onClick={() => setOpen((prev) => !prev)}
                onKeyDown={handleKeyDown}
            >
                <HelpCircle aria-hidden="true" size={16} />
                <span className="sr-only">{title}</span>
            </button>
            {open ? (
                <div role="dialog" id={popoverId} aria-label={title} className="help-popover__panel">
                    {typeof children === "string" ? <p>{children}</p> : children}
                </div>
            ) : null}
        </div>
    );
}