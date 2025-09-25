// src/app/vehicles/[id]/edit/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccountId } from "@/lib/current-account";
import { AssetType, ParentType } from "@prisma/client";
import { dateOrDash } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDateInput(value: Date | null | undefined) {
    return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function deriveVehicleAssetName(vehicle: { nickname: string | null; make: string | null; model: string | null; year: number | null }) {
    const nickname = vehicle.nickname?.trim();
    if (nickname) return nickname;
    const descriptor = [vehicle.year ? String(vehicle.year) : null, vehicle.make, vehicle.model].filter(Boolean).join(" ");
    return descriptor || "Vehicle";
}

async function updateVehicleAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();
    const id = (formData.get("id") as string | null)?.trim() || "";

    if (!id) {
        throw new Error("Missing vehicle id");
    }

    const existing = await prisma.vehicle.findFirst({
        where: { id, accountId },
        select: {
            id: true,
            accountId: true,
            primaryAssetId: true,
        },
    });

    if (!existing) {
        throw new Error("Vehicle not found or not in this account");
    }

    const nickname = (formData.get("nickname") as string | null)?.trim() || null;
    const make = (formData.get("make") as string | null)?.trim() || null;
    const model = (formData.get("model") as string | null)?.trim() || null;
    const yearRaw = (formData.get("year") as string | null)?.trim() || "";
    const vin = (formData.get("vin") as string | null)?.trim() || null;
    const notes = (formData.get("notes") as string | null)?.trim() || null;

    if (!nickname && !make && !model) {
        throw new Error("Provide a nickname or make/model to identify the vehicle");
    }

    const parsedYear = yearRaw ? Number(yearRaw) : NaN;
    const year = Number.isFinite(parsedYear) ? Math.round(parsedYear) : null;

    const licenseRenewal = (formData.get("licenseRenewalOn") as string | null)?.trim() || "";
    const insuranceExpires = (formData.get("insuranceExpiresOn") as string | null)?.trim() || "";
    const servicePlanExpires = (formData.get("servicePlanExpiresOn") as string | null)?.trim() || "";
    const roadworthyExpires = (formData.get("roadworthyExpiresOn") as string | null)?.trim() || "";

    const assetName = deriveVehicleAssetName({ nickname, make, model, year });

    await prisma.$transaction(async (tx) => {
        await tx.vehicle.update({
            where: { id },
            data: {
                nickname,
                make,
                model,
                year: year ?? undefined,
                vin,
                licenseRenewalOn: licenseRenewal ? new Date(licenseRenewal) : null,
                insuranceExpiresOn: insuranceExpires ? new Date(insuranceExpires) : null,
                servicePlanExpiresOn: servicePlanExpires ? new Date(servicePlanExpires) : null,
                roadworthyExpiresOn: roadworthyExpires ? new Date(roadworthyExpires) : null,
                notes,
            },
        });

        if (existing.primaryAssetId) {
            await tx.asset.update({
                where: { id: existing.primaryAssetId },
                data: {
                    name: assetName,
                    serial: vin ?? undefined,
                },
            });
        } else {
            const asset = await tx.asset.create({
                data: {
                    accountId: existing.accountId,
                    name: assetName,
                    assetType: AssetType.Car,
                    serial: vin ?? undefined,
                    parentType: ParentType.Vehicle,
                    parentId: id,
                },
                select: { id: true },
            });

            await tx.vehicle.update({
                where: { id },
                data: { primaryAssetId: asset.id },
            });
        }
    });

    revalidatePath(`/vehicles/${id}`);
    revalidatePath("/vehicles");
    revalidatePath("/assets");
    redirect(`/vehicles/${id}`);
}

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
    const accountId = await requireAccountId();

    const vehicle = await prisma.vehicle.findFirst({
        where: { id: params.id, accountId },
        select: {
            id: true,
            nickname: true,
            make: true,
            model: true,
            year: true,
            vin: true,
            licenseRenewalOn: true,
            insuranceExpiresOn: true,
            servicePlanExpiresOn: true,
            roadworthyExpiresOn: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!vehicle) {
        return notFound();
    }

    const titleParts = [vehicle.nickname, vehicle.year?.toString(), vehicle.make, vehicle.model].filter(Boolean);
    const headerTitle = titleParts.length ? `Edit ${titleParts.join(" ")}` : "Edit Vehicle";

    return (
        <main className="container py-8" style={{ maxWidth: 720 }}>
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1>{headerTitle}</h1>
                    <p className="text-muted-foreground" style={{ marginTop: 4 }}>
                        Created {dateOrDash(vehicle.createdAt)} · Updated {dateOrDash(vehicle.updatedAt)}
                    </p>
                </div>
                <Link href={`/vehicles/${vehicle.id}`} className="btn btn-outline">
                    Back
                </Link>
            </div>

            <form action={updateVehicleAction} className="card">
                <input type="hidden" name="id" value={vehicle.id} />
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <label className="field">
                        <span className="label">Nickname</span>
                        <input name="nickname" defaultValue={vehicle.nickname ?? ""} placeholder="e.g. Workhorse" />
                    </label>

                    <div className="grid grid-3">
                        <label className="field">
                            <span className="label">Make</span>
                            <input name="make" defaultValue={vehicle.make ?? ""} placeholder="e.g. Toyota" />
                        </label>
                        <label className="field">
                            <span className="label">Model</span>
                            <input name="model" defaultValue={vehicle.model ?? ""} placeholder="e.g. Hilux" />
                        </label>
                        <label className="field">
                            <span className="label">Year</span>
                            <input name="year" type="number" min="1900" max="2100" defaultValue={vehicle.year ?? ""} />
                        </label>
                    </div>

                    <label className="field">
                        <span className="label">VIN</span>
                        <input name="vin" defaultValue={vehicle.vin ?? ""} placeholder="Vehicle identification number" />
                    </label>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">License renewal</span>
                            <input type="date" name="licenseRenewalOn" defaultValue={formatDateInput(vehicle.licenseRenewalOn)} />
                        </label>
                        <label className="field">
                            <span className="label">Insurance expires</span>
                            <input type="date" name="insuranceExpiresOn" defaultValue={formatDateInput(vehicle.insuranceExpiresOn)} />
                        </label>
                    </div>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Service plan expires</span>
                            <input type="date" name="servicePlanExpiresOn" defaultValue={formatDateInput(vehicle.servicePlanExpiresOn)} />
                        </label>
                        <label className="field">
                            <span className="label">Roadworthy expires</span>
                            <input type="date" name="roadworthyExpiresOn" defaultValue={formatDateInput(vehicle.roadworthyExpiresOn)} />
                        </label>
                    </div>

                    <label className="field">
                        <span className="label">Notes</span>
                        <textarea name="notes" rows={4} defaultValue={vehicle.notes ?? ""} placeholder="Maintenance or ownership notes" />
                    </label>

                    <div className="space-x-2">
                        <Link href={`/vehicles/${vehicle.id}`} className="btn btn-outline">
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
