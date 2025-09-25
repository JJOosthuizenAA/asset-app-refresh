// src/app/components/LockedSelect.tsx
"use client";

import { useState } from "react";

type Option = { value: string; label: string };
type Props = {
    id: string;
    label: string;
    name: string;                  // name of the hidden input that will be submitted
    options: Option[];
    initialValue: string;          // starting value
    lockedByDefault?: boolean;     // default true
    helpLocked?: string;
    helpUnlocked?: string;
    required?: boolean;
};

export default function LockedSelect({
    id,
    label,
    name,
    options,
    initialValue,
    lockedByDefault = true,
    helpLocked = "Using the current selection. Click “Change” to modify.",
    helpUnlocked = "You can now select a different value.",
    required = false,
}: Props) {
    const [locked, setLocked] = useState(lockedByDefault);
    const [value, setValue] = useState(initialValue);

    return (
        <div className={`field ${locked ? "field-locked" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: ".75rem" }}>
                <label htmlFor={id} className="label">
                    {label} {required && <span className="req">*</span>}
                </label>
                <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setLocked(prev => !prev)}
                    aria-pressed={!locked}
                >
                    {locked ? "Change" : "Lock"}
                </button>
            </div>

            {/* Hidden input ensures we submit even while disabled */}
            <input type="hidden" name={name} value={value} />

            <select
                id={id}
                disabled={locked}
                value={value}
                onChange={(e) => setValue(e.target.value)}
            >
                {options.map(opt => (
                    <option key={opt.value || "empty"} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            <div className="text-muted-foreground" style={{ marginTop: 4 }}>
                {locked ? helpLocked : helpUnlocked}
            </div>
        </div>
    );
}
