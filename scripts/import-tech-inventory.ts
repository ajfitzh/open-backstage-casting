// scripts/import-tech-inventory.ts
// Migrates Baserow CYTF Sound Inventory (tables 611/612) & Lighting Inventory (tables 613/614)
// into Neon PostgreSQL `tech_equipment`, and copies any Baserow-hosted equipment photos +
// missing headshots permanently into DigitalOcean Spaces so the Baserow Droplet can be retired.

import { config } from "dotenv";
config({ path: ".env.local" });

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/index.ts";

const BASEROW_BASE = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(
  /\/$/,
  ""
);
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN || "";

const rawEndpoint = process.env.DO_SPACES_ENDPOINT || "nyc3.digitaloceanspaces.com";
const cleanEndpoint = rawEndpoint.replace(/^https?:\/\//, "").replace(/\/$/, "");
const bucket = process.env.DO_SPACES_BUCKET || "";

const s3 = new S3Client({
  region: process.env.DO_SPACES_REGION || "us-east-1",
  endpoint: `https://${cleanEndpoint}`,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
});

async function fetchAllBaserowRows(tableId: number) {
  const rows: any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${BASEROW_BASE}/api/database/rows/table/${tableId}/?user_field_names=true&size=200&page=${page}`,
      { headers: { Authorization: `Token ${BASEROW_TOKEN}` } }
    );
    if (!res.ok) throw new Error(`Baserow table ${tableId} fetch failed: ${res.status}`);
    const data = await res.json();
    const list = data.results || [];
    rows.push(...list);
    if (!data.next || list.length < 200) break;
    page++;
  }
  return rows;
}

const uploadedUrlCache = new Map<string, string>();

async function mirrorImageToSpaces(sourceUrl: string, keyPrefix: string): Promise<string> {
  if (!sourceUrl) return "";
  if (sourceUrl.includes("digitaloceanspaces.com")) return sourceUrl;
  if (uploadedUrlCache.has(sourceUrl)) return uploadedUrlCache.get(sourceUrl)!;

  const rawName = sourceUrl.split("/").pop()?.split("?")[0] || `asset-${Date.now()}.jpg`;
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const objectKey = `${keyPrefix}/${safeName}`;
  const publicUrl = `https://${bucket}.${cleanEndpoint}/${objectKey}`;

  // Skip upload if object already exists in Spaces (idempotent)
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
    uploadedUrlCache.set(sourceUrl, publicUrl);
    return publicUrl;
  } catch {
    // Not in Spaces yet -> download from Baserow & upload
  }

  const res = await fetch(sourceUrl);
  if (!res.ok) {
    console.warn(`  ! Could not download ${sourceUrl} (${res.status})`);
    return sourceUrl;
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );
  console.log(`  ☁ Mirrored to Spaces: ${objectKey} (${Math.round(buffer.length / 1024)} KB)`);
  uploadedUrlCache.set(sourceUrl, publicUrl);
  return publicUrl;
}

function normalizeStatus(raw: any): string {
  const val = typeof raw === "string" ? raw : raw?.value || "";
  const lower = val.toLowerCase();
  if (lower.includes("repair") || lower.includes("broken") || lower.includes("issue")) {
    return "In Repair";
  }
  if (lower.includes("out") || lower.includes("use") || lower.includes("deployed")) {
    return "Checked Out";
  }
  if (lower.includes("retired")) return "Retired";
  return "Available";
}

function extractVal(field: any): string | null {
  if (!field) return null;
  if (typeof field === "string") return field.trim() || null;
  if (typeof field === "number") return String(field);
  if (Array.isArray(field)) {
    const vals = field
      .map((x) => (typeof x === "string" ? x : x?.value))
      .filter(Boolean);
    return vals.length > 0 ? vals.join(", ") : null;
  }
  if (typeof field === "object" && field.value) return String(field.value);
  return null;
}

async function main() {
  const db = getDb();
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, "cytfred"))
    .limit(1);

  if (!org) throw new Error("cytfred org not found in Neon.");

  console.log("1) Fetching Sound & Lighting tables from Baserow...");
  const [soundModels, soundAssets, lightingModels, lightingFixtures] = await Promise.all([
    fetchAllBaserowRows(611),
    fetchAllBaserowRows(612),
    fetchAllBaserowRows(613),
    fetchAllBaserowRows(614),
  ]);

  console.log(
    `   Found: ${soundModels.length} sound models, ${soundAssets.length} sound assets, ` +
      `${lightingModels.length} lighting models, ${lightingFixtures.length} lighting fixtures.`
  );

  // Mirror Sound Model photos to DigitalOcean Spaces
  const soundModelMap = new Map<number, any>();
  for (const m of soundModels) {
    const rawPhoto = Array.isArray(m["Photo"]) && m["Photo"][0]?.url ? m["Photo"][0].url : null;
    const mirroredPhoto = rawPhoto ? await mirrorImageToSpaces(rawPhoto, "equipment/sound") : null;
    soundModelMap.set(m.id, { ...m, _photoUrl: mirroredPhoto });
  }

  // Mirror Lighting Model photos to DigitalOcean Spaces
  const lightingModelMap = new Map<number, any>();
  for (const m of lightingModels) {
    const rawPhoto = Array.isArray(m["Photo"]) && m["Photo"][0]?.url ? m["Photo"][0].url : null;
    const mirroredPhoto = rawPhoto
      ? await mirrorImageToSpaces(rawPhoto, "equipment/lighting")
      : null;
    lightingModelMap.set(m.id, { ...m, _photoUrl: mirroredPhoto });
  }

  console.log("2) Upserting Sound Assets into Neon tech_equipment...");
  let soundUpserts = 0;
  for (let i = 0; i < soundAssets.length; i++) {
    const row = soundAssets[i];
    const modelLink = Array.isArray(row["Item Model"]) ? row["Item Model"][0] : null;
    const model = modelLink ? soundModelMap.get(modelLink.id) : null;

    const rawCondPhoto =
      Array.isArray(row["Condition Photo"]) && row["Condition Photo"][0]?.url
        ? row["Condition Photo"][0].url
        : null;
    const photoUrl = rawCondPhoto
      ? await mirrorImageToSpaces(rawCondPhoto, "equipment/sound")
      : model?._photoUrl || null;

    const sku = `SND-${String(row.id).padStart(3, "0")}`;
    const qrCodeValue = `openbackstage://cytfred/equipment/${sku}`;
    const modelName = model?.["Model Name"] || modelLink?.value || "Sound Gear";
    const unitName = extractVal(row["Name"]) || `${modelName} #${row.id}`;

    await db
      .insert(schema.techEquipment)
      .values({
        organizationId: org.id,
        baserowKey: `sound_${row.id}`,
        department: "Sound",
        sku,
        qrCodeValue,
        name: unitName,
        modelName,
        manufacturer: extractVal(model?.["Manufacturer"]),
        category: extractVal(model?.["Category"]) || "Audio",
        serialNumber: extractVal(row["Serial Number"]),
        status: normalizeStatus(row["Status"]),
        location: extractVal(row["Location"]) || "Storage Closet",
        photoUrl,
        manualUrl: extractVal(model?.["Manual / Links"]),
        specs: {
          modelNumber: extractVal(model?.["Model Number"]),
        },
        notes: extractVal(row["Notes"]),
        lastStatusUpdate: extractVal(row["Last Status Update"]),
      })
      .onConflictDoUpdate({
        target: [schema.techEquipment.organizationId, schema.techEquipment.baserowKey],
        set: {
          name: unitName,
          modelName,
          manufacturer: extractVal(model?.["Manufacturer"]),
          category: extractVal(model?.["Category"]) || "Audio",
          serialNumber: extractVal(row["Serial Number"]),
          status: normalizeStatus(row["Status"]),
          location: extractVal(row["Location"]) || "Storage Closet",
          photoUrl,
          manualUrl: extractVal(model?.["Manual / Links"]),
          notes: extractVal(row["Notes"]),
          lastStatusUpdate: extractVal(row["Last Status Update"]),
          updatedAt: new Date(),
        },
      });
    soundUpserts++;
  }

  console.log("3) Upserting Lighting Fixtures into Neon tech_equipment...");
  let lightingUpserts = 0;
  for (const row of lightingFixtures) {
    const modelLink = Array.isArray(row["Fixture Model"]) ? row["Fixture Model"][0] : null;
    const model = modelLink ? lightingModelMap.get(modelLink.id) : null;

    const sku = `LGT-${String(row.id).padStart(3, "0")}`;
    const qrCodeValue = `openbackstage://cytfred/equipment/${sku}`;
    const modelName = model?.["Model Name"] || modelLink?.value || "Lighting Fixture";
    const rawUnitName = extractVal(row["Unit Name"]);
    const unitName = rawUnitName ? `${modelName} (${rawUnitName})` : `${modelName} #${row.id}`;

    await db
      .insert(schema.techEquipment)
      .values({
        organizationId: org.id,
        baserowKey: `lighting_${row.id}`,
        department: "Lighting",
        sku,
        qrCodeValue,
        name: unitName,
        modelName,
        manufacturer: extractVal(model?.["Manufacturer"]),
        category: extractVal(row["Type"]) || extractVal(model?.["Type"]) || "Lighting Fixture",
        serialNumber: extractVal(row["Unit ID"]),
        status: normalizeStatus(row["Status"]),
        location: extractVal(row["Storage Location"]) || "Lighting Rack",
        photoUrl: model?._photoUrl || null,
        manualUrl: extractVal(model?.["Manual / Link"]),
        specs: {
          lampType: extractVal(model?.["Lamp Type"]),
          dmxChannels: extractVal(model?.["DMX Channels"]),
          powerConnector: extractVal(model?.["Power Connector"]),
          dataConnector: extractVal(model?.["Data Connector"]),
          lampHours: extractVal(row["Lamp Hours"]),
        },
        notes: null,
        lastStatusUpdate: null,
      })
      .onConflictDoUpdate({
        target: [schema.techEquipment.organizationId, schema.techEquipment.baserowKey],
        set: {
          name: unitName,
          modelName,
          manufacturer: extractVal(model?.["Manufacturer"]),
          category: extractVal(row["Type"]) || extractVal(model?.["Type"]) || "Lighting Fixture",
          serialNumber: extractVal(row["Unit ID"]),
          status: normalizeStatus(row["Status"]),
          location: extractVal(row["Storage Location"]) || "Lighting Rack",
          photoUrl: model?._photoUrl || null,
          manualUrl: extractVal(model?.["Manual / Link"]),
          specs: {
            lampType: extractVal(model?.["Lamp Type"]),
            dmxChannels: extractVal(model?.["DMX Channels"]),
            powerConnector: extractVal(model?.["Power Connector"]),
            dataConnector: extractVal(model?.["Data Connector"]),
            lampHours: extractVal(row["Lamp Hours"]),
          },
          updatedAt: new Date(),
        },
      });
    lightingUpserts++;
  }

  console.log(
    `\n✅ Imported ${soundUpserts} sound assets + ${lightingUpserts} lighting fixtures (${soundUpserts + lightingUpserts} total) into Neon tech_equipment!`
  );
  console.log(`☁ Mirrored ${uploadedUrlCache.size} unique equipment photos into DigitalOcean Spaces!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
