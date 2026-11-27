import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db";

const SOURCE_DIR =
  process.argv[2] || path.join(os.homedir(), "Downloads", "CYT Program Pics");
const TENANT_SLUG = "cytfred";

function monthToSeasonAndSession(year: number, month: number): { season: string; session: string } {
  // Theater season runs Aug (8) -> Jul (7)
  if (month >= 8) {
    return { season: `${year}-${year + 1}`, session: "Fall" };
  }
  if (month <= 3) {
    return { season: `${year - 1}-${year}`, session: "Winter" };
  }
  if (month <= 6) {
    return { season: `${year - 1}-${year}`, session: "Spring" };
  }
  // July = Summer
  return { season: `${year - 1}-${year}`, session: "Summer" };
}

function normalizeTitle(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\bdr\b/g, "doctor")
    .replace(/\b(the|a|an|jr|kids|musical|disney|s|cyt|lite|stafford|master|camp|cct|not|lippas)\b/g, " ")
    .replace(/suessical/g, "seussical")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const bucket = (process.env.DO_SPACES_BUCKET || "").trim();
  const rawEndpoint = (process.env.DO_SPACES_ENDPOINT || "nyc3.digitaloceanspaces.com").trim();
  const cleanEndpoint = rawEndpoint.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const accessKeyId = (process.env.DO_SPACES_KEY || "").trim();
  const secretAccessKey = (process.env.DO_SPACES_SECRET || "").trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing DO_SPACES_BUCKET / DO_SPACES_KEY / DO_SPACES_SECRET in .env.local");
  }

  const s3 = new S3Client({
    region: process.env.DO_SPACES_REGION || "us-east-1",
    endpoint: `https://${cleanEndpoint}`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const db = getDb();
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, TENANT_SLUG))
    .limit(1);
  if (!org) throw new Error(`Organization ${TENANT_SLUG} not found`);

  const prods = await db
    .select({
      id: schema.productions.id,
      title: schema.productions.title,
      sessionLabel: schema.productions.sessionLabel,
      seasonName: schema.seasons.name,
      showImageUrl: schema.productions.showImageUrl,
    })
    .from(schema.productions)
    .leftJoin(schema.seasons, eq(schema.productions.seasonId, schema.seasons.id))
    .where(eq(schema.productions.organizationId, org.id));

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => /\.(heic|jpe?g|png|webp)$/i.test(f))
    .sort();

  const tmpDir = path.join(os.tmpdir(), "cyt-playbills-jpg");
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`Found ${files.length} playbill scans in ${SOURCE_DIR}\n`);

  let uploadedCount = 0;
  const unmatched: string[] = [];

  for (const filename of files) {
    const ext = path.extname(filename);
    const stem = filename.slice(0, -ext.length).trim();

    // Parse "YYYY-MM Title" or "YYYY Title"
    let targetSeason: string | null = null;
    let targetYear: number | null = null;
    let rawTitle = stem;

    const ymMatch = stem.match(/^(\d{4})-(\d{2})\s+(.+)$/);
    const yMatch = stem.match(/^(\d{4})\s+(.+)$/);
    if (ymMatch) {
      targetYear = parseInt(ymMatch[1], 10);
      const month = parseInt(ymMatch[2], 10);
      targetSeason = monthToSeasonAndSession(targetYear, month).season;
      rawTitle = ymMatch[3].trim();
    } else if (yMatch) {
      targetYear = parseInt(yMatch[1], 10);
      rawTitle = yMatch[2].trim();
    }

    const normNeedle = normalizeTitle(rawTitle);
    const needleWords = normNeedle.split(" ").filter((w) => w.length >= 2);

    // Score every production by season match + title token overlap
    let bestProd: (typeof prods)[number] | null = null;
    let bestScore = 0;

    for (const p of prods) {
      const normProd = normalizeTitle(p.title);
      let titleScore = 0;
      if (normProd === normNeedle) {
        titleScore = 100;
      } else if (normProd.includes(normNeedle) || normNeedle.includes(normProd)) {
        titleScore = 80;
      } else {
        const prodWords = new Set(normProd.split(" "));
        let hits = 0;
        for (const w of needleWords) {
          if (prodWords.has(w) || normProd.includes(w)) hits++;
        }
        if (needleWords.length > 0 && hits > 0) {
          titleScore = Math.round((hits / needleWords.length) * 70);
        }
      }

      if (titleScore < 45) continue;

      let seasonBonus = 0;
      if (targetSeason && p.seasonName === targetSeason) {
        seasonBonus = 60;
      } else if (targetYear && p.seasonName) {
        const [sy, ey] = p.seasonName.split("-").map(Number);
        if (sy === targetYear || ey === targetYear) {
          seasonBonus = 30;
        } else {
          // Strong penalty if year doesn't match at all
          seasonBonus = -50;
        }
      }

      const total = titleScore + seasonBonus;
      if (total > bestScore) {
        bestScore = total;
        bestProd = p;
      }
    }

    if (!bestProd || bestScore < 60) {
      unmatched.push(filename);
      console.log(`  [unmatched] ${filename} (bestScore=${bestScore})`);
      continue;
    }

    const outName = `${slugify(stem)}.jpg`;
    const key = `tenants/${TENANT_SLUG}/playbills/${outName}`;
    const publicUrl = `https://${bucket}.${cleanEndpoint}/${key}`;

    if (bestProd.showImageUrl === publicUrl) {
      uploadedCount++;
      continue;
    }

    // Convert to web-optimized JPEG (max 1600px, quality 82)
    const srcPath = path.join(SOURCE_DIR, filename);
    const outPath = path.join(tmpDir, outName);

    execFileSync("sips", [
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      "82",
      "-Z",
      "1600",
      srcPath,
      "--out",
      outPath,
    ]);

    const fileBytes = fs.readFileSync(outPath);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBytes,
        ContentType: "image/jpeg",
        ACL: "public-read",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    // 1. Update productions.show_image_url
    await db
      .update(schema.productions)
      .set({ showImageUrl: publicUrl, updatedAt: new Date() })
      .where(and(eq(schema.productions.organizationId, org.id), eq(schema.productions.id, bestProd.id)));

    // 2. Upsert into assets table as a Playbill gallery item
    const existingAssets = await db
      .select({ id: schema.assets.id, url: schema.assets.url })
      .from(schema.assets)
      .where(
        and(
          eq(schema.assets.organizationId, org.id),
          eq(schema.assets.productionId, bestProd.id)
        )
      );

    if (!existingAssets.some((a) => a.url === publicUrl)) {
      await db.insert(schema.assets).values({
        organizationId: org.id,
        productionId: bestProd.id,
        name: `Playbill Cover — ${bestProd.title}`,
        url: publicUrl,
        type: "Playbill",
      });
    }

    uploadedCount++;
    console.log(
      `  ✔ ${filename} -> [${bestProd.seasonName} ${bestProd.sessionLabel || ""}] ${bestProd.title} (${Math.round(fileBytes.length / 1024)} KB)`
    );
  }

  console.log(`\nDone! Uploaded & linked ${uploadedCount}/${files.length} playbills. Unmatched: ${unmatched.length}`);
  if (unmatched.length > 0) console.log("Unmatched files:", unmatched);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
