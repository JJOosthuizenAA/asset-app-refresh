import { PrismaClient, ParentType, SupplierCapabilityType, AssetType } from "@prisma/client";
import { ensureUnknownSupplier } from "../src/lib/suppliers";

const prisma = new PrismaClient();

type SupplierSeed = {
  id: string;
  name: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  registrationNumber?: string;
  isSales?: boolean;
  isMaintenance?: boolean;
  addressLine1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  serviceRadiusKm?: number;
  capabilities: SupplierCapabilityType[];
};

type AssetSeed = {
  id: string;
  name: string;
  type: AssetType;
  category?: string;
  serial?: string | null;
  location?: string | null;
  parentPropertyId: string;
  primarySupplierRef: string;
};

type TaskSeed = {
  id: string;
  title: string;
  notes?: string | null;
  dueInDays?: number;
  assetRef: string;
  parentPropertyId: string;
  preferredSupplierRef?: string;
  selfServiceSelected?: boolean;
};

type AccountSeed = {
  account: { code: string; name: string; currencyCode: string };
  address: { addressLine1: string; city: string; region?: string; postalCode?: string; countryCode: string };
  property: { id: string; name: string; label?: string | null; addressLine1?: string; city?: string; region?: string; postalCode?: string; countryCode?: string };
  suppliers: SupplierSeed[];
  assets: AssetSeed[];
  tasks: TaskSeed[];
};

const SAMPLE_DATA: AccountSeed[] = [
  {
    account: { code: "ACME-EST", name: "Acme Estates", currencyCode: "ZAR" },
    address: {
      addressLine1: "15 Vineyard Avenue",
      city: "Cape Town",
      region: "Western Cape",
      postalCode: "8001",
      countryCode: "ZA",
    },
    property: {
      id: "prop-acme-main",
      name: "Vineyard Villa",
      label: "Head Office Residence",
      addressLine1: "15 Vineyard Avenue",
      city: "Cape Town",
      region: "Western Cape",
      postalCode: "8001",
      countryCode: "ZA",
    },
    suppliers: [
      {
        id: "sup-acme-electrical",
        name: "BrightSpark Electrical",
        description: "Certified electricians specialising in backup power and solar systems.",
        contactName: "Sipho Nkosi",
        contactEmail: "info@brightspark.co.za",
        contactPhone: "+27 21 555 0123",
        isMaintenance: true,
        addressLine1: "101 Industry Road",
        city: "Cape Town",
        region: "Western Cape",
        postalCode: "7405",
        countryCode: "ZA",
        serviceRadiusKm: 50,
        capabilities: [SupplierCapabilityType.Electrical, SupplierCapabilityType.Solar],
      },
      {
        id: "sup-acme-plumbing",
        name: "FlowRight Plumbing",
        description: "Domestic and commercial plumbing maintenance.",
        contactName: "Leila Govender",
        contactEmail: "service@flowright.co.za",
        contactPhone: "+27 82 555 9012",
        isMaintenance: true,
        addressLine1: "22 Waterfall Street",
        city: "Cape Town",
        region: "Western Cape",
        postalCode: "7441",
        countryCode: "ZA",
        serviceRadiusKm: 35,
        capabilities: [SupplierCapabilityType.Plumbing],
      },
      {
        id: "sup-acme-decor",
        name: "DecoCity Supplies",
        description: "Interior finishing materials supplier.",
        isSales: true,
        isMaintenance: false,
        addressLine1: "55 Market Lane",
        city: "Cape Town",
        region: "Western Cape",
        postalCode: "8000",
        countryCode: "ZA",
        capabilities: [SupplierCapabilityType.Other],
      },
    ],
    assets: [
      {
        id: "asset-acme-gate",
        name: "Main Entrance Gate",
        type: AssetType.Fixture,
        category: "Security",
        parentPropertyId: "prop-acme-main",
        primarySupplierRef: "sup-acme-electrical",
        location: "Front driveway",
      },
      {
        id: "asset-acme-geyser",
        name: "Upper-Level Geyser",
        type: AssetType.Appliance,
        category: "Plumbing",
        parentPropertyId: "prop-acme-main",
        primarySupplierRef: "sup-acme-plumbing",
        location: "Bathroom 3",
      },
    ],
    tasks: [
      {
        id: "task-acme-gate-service",
        title: "Quarterly gate motor service",
        notes: "Check battery backup, lubricate chain, test remote receivers.",
        dueInDays: 21,
        assetRef: "asset-acme-gate",
        parentPropertyId: "prop-acme-main",
        preferredSupplierRef: "sup-acme-electrical",
      },
      {
        id: "task-acme-geyser-flush",
        title: "Flush geyser and check pressure valve",
        notes: "Homeowner to flush per manufacturer guide.",
        dueInDays: 10,
        assetRef: "asset-acme-geyser",
        parentPropertyId: "prop-acme-main",
        selfServiceSelected: true,
      },
    ],
  },
  {
    account: { code: "FLEET-OPS", name: "Fleet Operations", currencyCode: "ZAR" },
    address: {
      addressLine1: "48 Logistic Park",
      city: "Johannesburg",
      region: "Gauteng",
      postalCode: "1619",
      countryCode: "ZA",
    },
    property: {
      id: "prop-fleet-yard",
      name: "Kempton Truck Yard",
      label: "Vehicle Depot",
      addressLine1: "48 Logistic Park",
      city: "Johannesburg",
      region: "Gauteng",
      postalCode: "1619",
      countryCode: "ZA",
    },
    suppliers: [
      {
        id: "sup-fleet-mech",
        name: "RoadReady Mechanics",
        description: "Heavy vehicle maintenance and inspections.",
        contactName: "Thabo Motaung",
        contactEmail: "bookings@roadready.co.za",
        contactPhone: "+27 11 555 7714",
        isMaintenance: true,
        addressLine1: "12 Workshop Avenue",
        city: "Johannesburg",
        region: "Gauteng",
        postalCode: "1601",
        countryCode: "ZA",
        serviceRadiusKm: 70,
        capabilities: [SupplierCapabilityType.GeneralMaintenance],
      },
      {
        id: "sup-fleet-tyre",
        name: "TyreMaxx",
        description: "Commercial tyre sales and fitment.",
        contactEmail: "sales@tyremaxx.co.za",
        contactPhone: "+27 11 447 9900",
        isMaintenance: true,
        isSales: true,
        addressLine1: "90 Ring Road",
        city: "Johannesburg",
        region: "Gauteng",
        postalCode: "1685",
        countryCode: "ZA",
        serviceRadiusKm: 100,
        capabilities: [SupplierCapabilityType.GeneralMaintenance],
      },
    ],
    assets: [
      {
        id: "asset-fleet-truck-001",
        name: "Truck 001 - Volvo FH",
        type: AssetType.Vehicle,
        serial: "VIN-FH-001",
        parentPropertyId: "prop-fleet-yard",
        primarySupplierRef: "sup-fleet-mech",
        location: "Bay A3",
      },
      {
        id: "asset-fleet-trailer-01",
        name: "Refrigerated Trailer",
        type: AssetType.Trailer,
        category: "Logistics",
        parentPropertyId: "prop-fleet-yard",
        primarySupplierRef: "sup-fleet-tyre",
        location: "Bay B1",
      },
    ],
    tasks: [
      {
        id: "task-fleet-truck-service",
        title: "6-week safety inspection",
        notes: "Comply with operator permit requirements.",
        dueInDays: 14,
        assetRef: "asset-fleet-truck-001",
        parentPropertyId: "prop-fleet-yard",
        preferredSupplierRef: "sup-fleet-mech",
      },
      {
        id: "task-fleet-trailer-tyres",
        title: "Rotate trailer tyres",
        dueInDays: 5,
        assetRef: "asset-fleet-trailer-01",
        parentPropertyId: "prop-fleet-yard",
        preferredSupplierRef: "sup-fleet-tyre",
      },
    ],
  },
];

async function upsertSupplier(accountId: string, seed: SupplierSeed) {
  const supplier = await prisma.supplier.upsert({
    where: { id: seed.id },
    update: {
      name: seed.name,
      description: seed.description ?? null,
      contactName: seed.contactName ?? null,
      contactEmail: seed.contactEmail ?? null,
      contactPhone: seed.contactPhone ?? null,
      registrationNumber: seed.registrationNumber ?? null,
      isSales: seed.isSales ?? false,
      isMaintenance: seed.isMaintenance ?? false,
      addressLine1: seed.addressLine1 ?? null,
      city: seed.city ?? null,
      region: seed.region ?? null,
      postalCode: seed.postalCode ?? null,
      countryCode: seed.countryCode ?? null,
      serviceRadiusKm: seed.serviceRadiusKm ?? null,
    },
    create: {
      id: seed.id,
      accountId,
      name: seed.name,
      description: seed.description ?? null,
      contactName: seed.contactName ?? null,
      contactEmail: seed.contactEmail ?? null,
      contactPhone: seed.contactPhone ?? null,
      registrationNumber: seed.registrationNumber ?? null,
      isSales: seed.isSales ?? false,
      isMaintenance: seed.isMaintenance ?? false,
      addressLine1: seed.addressLine1 ?? null,
      city: seed.city ?? null,
      region: seed.region ?? null,
      postalCode: seed.postalCode ?? null,
      countryCode: seed.countryCode ?? null,
      serviceRadiusKm: seed.serviceRadiusKm ?? null,
    },
  });

  for (const capability of seed.capabilities) {
    await prisma.supplierCapability.upsert({
      where: {
        supplierId_capability: {
          supplierId: supplier.id,
          capability,
        },
      },
      update: {},
      create: {
        supplierId: supplier.id,
        capability,
      },
    });
  }

  return supplier;
}

async function upsertAsset(accountId: string, seed: AssetSeed) {
  return prisma.asset.upsert({
    where: { id: seed.id },
    update: {
      name: seed.name,
      assetType: seed.type,
      category: seed.category ?? null,
      serial: seed.serial ?? null,
      location: seed.location ?? null,
      primarySupplierId: seed.primarySupplierRef,
    },
    create: {
      id: seed.id,
      accountId,
      parentType: ParentType.Property,
      parentId: seed.parentPropertyId,
      name: seed.name,
      assetType: seed.type,
      category: seed.category ?? null,
      serial: seed.serial ?? null,
      location: seed.location ?? null,
      primarySupplierId: seed.primarySupplierRef,
    },
  });
}

async function upsertTask(seed: TaskSeed, accountId: string) {
  const dueDate = seed.dueInDays ? new Date(Date.now() + seed.dueInDays * 24 * 60 * 60 * 1000) : null;
  return prisma.maintenanceTask.upsert({
    where: { id: seed.id },
    update: {
      title: seed.title,
      notes: seed.notes ?? null,
      dueDate,
      preferredSupplierId: seed.preferredSupplierRef ?? null,
      selfServiceSelected: seed.selfServiceSelected ?? false,
    },
    create: {
      id: seed.id,
      title: seed.title,
      notes: seed.notes ?? null,
      dueDate,
      completed: false,
      assetId: seed.assetRef,
      parentType: ParentType.Property,
      parentId: seed.parentPropertyId,
      preferredSupplierId: seed.preferredSupplierRef ?? null,
      selfServiceSelected: seed.selfServiceSelected ?? false,
    },
  });
}

async function seed() {
  console.log(`Seeding ${SAMPLE_DATA.length} accounts with sample data...`);

  for (const entry of SAMPLE_DATA) {
    const account = await prisma.account.upsert({
      where: { code: entry.account.code },
      update: { name: entry.account.name, currencyCode: entry.account.currencyCode },
      create: {
        code: entry.account.code,
        name: entry.account.name,
        currencyCode: entry.account.currencyCode,
      },
    });

    await prisma.accountAddress.upsert({
      where: { accountId: account.id },
      update: entry.address,
      create: { accountId: account.id, ...entry.address },
    });

    await prisma.property.upsert({
      where: { id: entry.property.id },
      update: {
        name: entry.property.name,
        label: entry.property.label ?? null,
        addressLine1: entry.property.addressLine1 ?? null,
        city: entry.property.city ?? null,
        region: entry.property.region ?? null,
        postalCode: entry.property.postalCode ?? null,
        countryCode: entry.property.countryCode ?? null,
      },
      create: {
        id: entry.property.id,
        accountId: account.id,
        name: entry.property.name,
        label: entry.property.label ?? null,
        addressLine1: entry.property.addressLine1 ?? null,
        city: entry.property.city ?? null,
        region: entry.property.region ?? null,
        postalCode: entry.property.postalCode ?? null,
        countryCode: entry.property.countryCode ?? null,
      },
    });

    const fallbackSupplierId = await ensureUnknownSupplier(prisma, account.id);

    const supplierMap = new Map<string, string>();
    supplierMap.set("unknown", fallbackSupplierId);

    for (const supplierSeed of entry.suppliers) {
      const supplier = await upsertSupplier(account.id, supplierSeed);
      supplierMap.set(supplierSeed.id, supplier.id);
    }

    const assetMap = new Map<string, string>();
    for (const assetSeed of entry.assets) {
      const supplierId = supplierMap.get(assetSeed.primarySupplierRef) ?? fallbackSupplierId;
      const asset = await upsertAsset(account.id, { ...assetSeed, primarySupplierRef: supplierId });
      assetMap.set(assetSeed.id, asset.id);
    }

    for (const taskSeed of entry.tasks) {
      const assetId = assetMap.get(taskSeed.assetRef);
      if (!assetId) {
        console.warn(`Skipping task ${taskSeed.id} because asset ${taskSeed.assetRef} was not created.`);
        continue;
      }
      await upsertTask(
        {
          ...taskSeed,
          assetRef: assetId,
          preferredSupplierRef: taskSeed.preferredSupplierRef
            ? supplierMap.get(taskSeed.preferredSupplierRef) ?? fallbackSupplierId
            : undefined,
        },
        account.id
      );
    }

    console.log(`Seeded data for account ${entry.account.name} (${account.code})`);
  }

  console.log("Sample data seed complete.");
}

seed()
  .catch((error) => {
    console.error("Failed to seed sample data", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
