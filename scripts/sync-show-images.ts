// scripts/sync-show-images.ts
// Scans a DigitalOcean Spaces bucket/prefix for show artwork images and matches them
// to productions in Neon PostgreSQL (`productions.show_image_url`).
//
// Usage:
//   npx tsx scripts/sync-show-images.ts --tenant=cytfred --bucket=my-bucket --endpoint=nyc3.digitaloceanspaces.com --prefix=shows/ --dry-run
//   npx tsx scripts/sync-show-images.ts --tenant=cytfred --bucket=my-bucket --endpoint=nyc3.digitaloceanspaces.com --prefix=shows/ --apply

import { config } from "dotenv";
config({ path: ".env.local" });

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/index.ts";
import { matchShowImageKeyToProduction } from "../app/lib/db/role-helpers.ts";

function getArg(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|webp|avif)$/i;

async function main() {
  const tenantSlug = getArg("tenant", "cytfred").trim().toLowerCase();
  const bucket = getArg("bucket", process.env.DO_SPACES_BUCKET || "").trim();
  const rawEndpoint = getArg(
    "endpoint",
    process.env.DO_SPACES_ENDPOINT || "nyc3.digitaloceanspaces.com"
  ).trim();
  const cleanEndpoint = rawEndpoint.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const prefix = getArg("prefix", "").trim();
  const apply = process.argv.includes("--apply");

  if (!bucket) {
    console.error("Missing --bucket or DO_SPACES_BUCKET.");
    process.exit(1);
  }

  const db = getDb();
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, tenantSlug))
    .limit(1);

  if (!org) {
    console.error(`Organization "${tenantSlug}" not found in PostgreSQL.`);
    process.exit(1);
  }

  const prods = await db
    .select({
      id: schema.productions.id,
      baserowId: schema.productions.baserowId,
      title: schema.productions.title,
      showImageUrl: schema.productions.showImageUrl,
    })
    .from(schema.productions)
    .where(eq(schema.productions.organizationId, org.id));

  const s3 = new S3Client({
    region: process.env.DO_SPACES_REGION || "us-east-1",
    endpoint: `https://${cleanEndpoint}`,
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY || "",
      secretAccessKey: process.env.DO_SPACES_SECRET || "",
    },
  });

  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || undefined,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    for (const obj of res.Contents || []) {
      if (obj.Key && IMAGE_EXT_RE.test(obj.Key)) {
        keys.push(obj.Key);
      }
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  console.log(
    `Scanned s3://${bucket}/${prefix} (${cleanEndpoint}): ${keys.length} image files, ${prods.length} productions in ${tenantSlug}.`
  );

  const updates: { prodId: number; title: string; key: string; url: string }[] = [];
  const unmatched: string[] = [];

  for (const key of keys) {
    const match = matchShowImageKeyToProduction(key, prods);
    if (!match) {
      unmatched.push(key);
      continue;
    }
    const encodedKey = key
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    const publicUrl = `https://${bucket}.${cleanEndpoint}/${encodedKey}`;
    updates.push({ prodId: match.id, title: match.title, key, url: publicUrl });
  }

  console.log(`Matched: ${updates.length} | Unmatched: ${unmatched.length}`);
  for (const u of updates.slice(0, 25)) {
    console.log(`  ✔ [${u.title}] <- ${u.key}`);
  }
  if (updates.length > 25) {
    console.log(`  ... and ${updates.length - 25} more matches.`);
  }

  if (!apply) {
    console.log("\nDry run complete. Re-run with --apply to write matched URLs to Neon.");
    return;
  }

  for (const u of updates) {
    await db
      .update(schema.productions)
      .set({ showImageUrl: u.url, updatedAt: new Date() })
      .where(eq(schema.productions.id, u.prodId));
  }

  console.log(`\n✅ Updated show_image_url for ${updates.length} productions in Neon PostgreSQL.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
