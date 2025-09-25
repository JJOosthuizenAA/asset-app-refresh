// src/app/settings/account/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { COUNTRY_OPTIONS } from "@/lib/countries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertCountry(code: string) {
    if (!code) {
        throw new Error("Please pick a country.");
    }
    const match = COUNTRY_OPTIONS.find((option) => option.value === code);
    if (!match) {
        throw new Error("Select a valid country from the list.");
    }
    return match.value;
}

function assertCurrency(code: string) {
    if (!/^[A-Z]{3}$/.test(code)) {
        throw new Error("Currency code must be a 3-letter ISO value (e.g. USD).");
    }
    return code;
}

async function updateAccountAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();
    const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true },
    });

    if (!account) {
        throw new Error("Account not found");
    }

    const name = (formData.get("name") as string | null)?.trim() || null;
    const countryInput = ((formData.get("countryCode") as string | null) ?? "").trim().toUpperCase();
    const currencyInput = ((formData.get("currencyCode") as string | null) ?? "").trim().toUpperCase();

    const countryCode = assertCountry(countryInput);
    const currencyCode = assertCurrency(currencyInput);

    await prisma.account.update({
        where: { id: accountId },
        data: {
            name,
            countryCode,
            currencyCode,
        },
    });

    revalidatePath("/settings/account");
    revalidatePath("/properties/new");
    revalidatePath("/assets/new");
    redirect("/settings/account");
}

export default async function AccountSettingsPage() {
    const accountId = await requireAccountId();
    const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: {
            code: true,
            name: true,
            countryCode: true,
            currencyCode: true,
        },
    });

    if (!account) {
        throw new Error("Account not found");
    }

    return (
        <main className="container py-8" style={{ maxWidth: 640 }}>
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1>Account Settings</h1>
                    <p className="text-muted-foreground" style={{ marginTop: 4 }}>
                        Update the default country and currency used across the workspace.
                    </p>
                </div>
                <Link href="/settings" className="btn btn-outline">Back</Link>
            </div>

            <form action={updateAccountAction} className="card">
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <div className="field">
                        <span className="label">Account code</span>
                        <div>{account.code}</div>
                    </div>

                    <label className="field">
                        <span className="label">Account name</span>
                        <input name="name" placeholder="Company or household" defaultValue={account.name ?? ""} />
                    </label>

                    <label className="field">
                        <span className="label">Country <span className="req">*</span></span>
                        <select name="countryCode" defaultValue={account.countryCode ?? ""} required>
                            <option value="" disabled>
                                Select country
                            </option>
                            {COUNTRY_OPTIONS.map((country) => (
                                <option key={country.value} value={country.value}>
                                    {country.label}
                                </option>
                            ))}
                        </select>
                        <small className="text-xs text-muted-foreground">
                            Determines address defaults and localisation across the app.
                        </small>
                    </label>

                    <label className="field">
                        <span className="label">Currency <span className="req">*</span></span>
                        <input
                            name="currencyCode"
                            placeholder="e.g. USD"
                            defaultValue={account.currencyCode ?? ""}
                            maxLength={3}
                            required
                            style={{ textTransform: "uppercase" }}
                        />
                        <small className="text-xs text-muted-foreground">
                            Use a valid ISO-4217 currency code such as USD, EUR, or ZAR.
                        </small>
                    </label>

                    <div className="space-x-2" style={{ marginTop: "0.5rem" }}>
                        <Link href="/settings" className="btn btn-outline">
                            Cancel
                        </Link>
                        <button type="submit" className="btn btn-primary">
                            Save
                        </button>
                    </div>
                </div>
            </form>
        </main>
    );
}
