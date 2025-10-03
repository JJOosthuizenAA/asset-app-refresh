// src/app/vehicles/new/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureUnknownSupplier } from "@/lib/suppliers";
import { requireAccountId } from "@/lib/current-account";
import { AssetType, ParentType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function deriveVehicleAssetName(vehicle: { nickname: string | null; make: string | null; model: string | null; year: number | null }) {
    const nickname = vehicle.nickname?.trim();
    if (nickname) return nickname;
    const descriptor = [vehicle.year ? String(vehicle.year) : null, vehicle.make, vehicle.model].filter(Boolean).join(" ");
    return descriptor || "Vehicle";
}

async function createVehicleAction(formData: FormData) {
    "use server";

    const accountId = await requireAccountId();

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

    const { vehicleId } = await prisma.$transaction(async (tx) => {
        const unknownSupplierId = await ensureUnknownSupplier(tx, accountId);
        const createdVehicle = await tx.vehicle.create({
            data: {
                accountId,
                nickname,
                make,
                model,
                year: year ?? undefined,
                vin,
                licenseRenewalOn: licenseRenewal ? new Date(licenseRenewal) : undefined,
                insuranceExpiresOn: insuranceExpires ? new Date(insuranceExpires) : undefined,
                servicePlanExpiresOn: servicePlanExpires ? new Date(servicePlanExpires) : undefined,
                roadworthyExpiresOn: roadworthyExpires ? new Date(roadworthyExpires) : undefined,
                notes,
            },
            select: { id: true },
        });

        const primaryAsset = await tx.asset.create({
            data: {
                accountId,
                name: assetName,
                assetType: AssetType.Car,
                serial: vin ?? undefined,
                parentType: ParentType.Vehicle,
                parentId: createdVehicle.id,                primarySupplierId: unknownSupplierId,
            },
            select: { id: true },
        });

        await tx.vehicle.update({
            where: { id: createdVehicle.id },
            data: { primaryAssetId: primaryAsset.id },
        });

        return { vehicleId: createdVehicle.id };
    });

    revalidatePath("/vehicles");
    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath("/assets");
    redirect(`/vehicles/${vehicleId}`);
}

export default function NewVehiclePage() {
    return (
        <main className="container py-8">
            <div className="mb-6" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>New Vehicle</h1>
                <Link href="/vehicles" className="btn btn-outline">Back</Link>
            </div>

            <form action={createVehicleAction} className="card" style={{ maxWidth: 720 }}>
                <div className="card-content" style={{ display: "grid", gap: "1rem" }}>
                    <label className="field">
                        <span className="label">Nickname</span>
                        <input name="nickname" placeholder="e.g. Workhorse" />
                    </label>

                    <div className="grid grid-3">
                        <label className="field">
                            <span className="label">Make</span>
                            <input name="make" placeholder="e.g. Toyota" />
                        </label>
                        <label className="field">
                            <span className="label">Model</span>
                            <input name="model" placeholder="e.g. Hilux" />
                        </label>
                        <label className="field">
                            <span className="label">Year</span>
                            <input name="year" type="number" min="1900" max="2100" />
                        </label>
                    </div>

                    <label className="field">
                        <span className="label">VIN</span>
                        <input name="vin" placeholder="Vehicle identification number" />
                    </label>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">License renewal</span>
                            <input type="date" name="licenseRenewalOn" />
                        </label>
                        <label className="field">
                            <span className="label">Insurance expires</span>
                            <input type="date" name="insuranceExpiresOn" />
                        </label>
                    </div>

                    <div className="grid grid-2">
                        <label className="field">
                            <span className="label">Service plan expires</span>
                            <input type="date" name="servicePlanExpiresOn" />
                        </label>
                        <label className="field">
                            <span className="label">Roadworthy expires</span>
                            <input type="date" name="roadworthyExpiresOn" />
                        </label>
                    </div>

                    <label className="field">
                        <span className="label">Notes</span>
                        <textarea name="notes" rows={4} placeholder="Maintenance or ownership notes" />
                    </label>

                    <div className="space-x-2">
                        <Link href="/vehicles" className="btn btn-outline">Cancel</Link>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </main>
    );
}





