/**
 * CYT Fredericksburg Legacy Website Sync (Playwright + Neon PostgreSQL)
 *
 * Usage:
 *   # Public sync (shows, banner artwork, performance dates/times, ticket prices, character lists, classes):
 *   npm run sync:cytfred
 *
 *   # Dry-run preview (no DB writes):
 *   npm run sync:cytfred -- --dry-run
 *
 *   # Authenticated sync (opens a visible Chromium browser for you to log into cytfredericksburg.org,
 *   # or auto-fills CYT_LEGACY_EMAIL / CYT_LEGACY_PASSWORD from .env.local, then captures authenticated
 *   # Cast & Crew Hub / account pages to scripts/.cytfred-auth-export.json):
 *   npm run sync:cytfred -- --auth
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { and, desc, eq, ilike } from "drizzle-orm";
import { getDb, schema } from "../db";

const BASE_URL = "https://www.cytfredericksburg.org";
const TENANT_SLUG = "cytfred";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const AUTH_MODE = args.has("--auth");

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parsePerformanceDateTime(rawLine: string, fallbackYear: number): Date | null {
  // Matches e.g. "Friday, Feb 26th @ 7:00pm" or "Saturday, Mar 6th @ 2:00pm"
  const m = rawLine.match(
    /([A-Za-z]{3})[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\s*@\s*(\d{1,2}):(\d{2})\s*(am|pm)/i
  );
  if (!m) return null;
  const monthIdx = MONTH_MAP[m[1].toLowerCase()];
  if (monthIdx === undefined) return null;
  const day = parseInt(m[2], 10);
  let hour = parseInt(m[3], 10);
  const minute = parseInt(m[4], 10);
  const ampm = m[5].toLowerCase();
  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  return new Date(Date.UTC(fallbackYear, monthIdx, day, hour + 5, minute, 0));
}

function parsePriceCents(text: string): number {
  const m = text.match(/\$(\d+(?:\.\d{2})?)/);
  if (!m) return 1800;
  return Math.round(parseFloat(m[1]) * 100);
}

interface ScrapedShowDetail {
  url: string;
  title: string;
  imageUrl: string | null;
  performances: { label: string; startsAt: Date | null }[];
  standardPriceCents: number;
  characters: string[];
}

interface ScrapedClassRow {
  className: string;
  minAge: number | null;
  maxAge: number | null;
  sessionName: string;
  location: string;
  day: string;
  timeSlot: string;
}

async function scrapePublicShows(page: import("@playwright/test").Page): Promise<ScrapedShowDetail[]> {
  console.log(`\n[1/2] Visiting ${BASE_URL}/shows/ ...`);
  await page.goto(`${BASE_URL}/shows/`, { waitUntil: "domcontentloaded", timeout: 30000 });

  const showLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a[href*='/shows/']"));
    const unique = new Set<string>();
    for (const a of anchors) {
      const href = (a as HTMLAnchorElement).href;
      if (/\/shows\/[^/]+\/\d+/.test(href)) {
        unique.add(href);
      }
    }
    return Array.from(unique);
  });

  console.log(`  Found ${showLinks.length} detailed show page(s):`, showLinks);
  const results: ScrapedShowDetail[] = [];

  for (const url of showLinks) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const detail = await page.evaluate(() => {
      const title =
        document.querySelector("h1")?.textContent?.trim() ||
        document.title.split("|")[0]?.trim() ||
        "Untitled Show";

      // Find show banner image (non-logo)
      const imgs = Array.from(document.querySelectorAll("img"))
        .map((img) => img.getAttribute("src") || "")
        .filter((src) => src.includes("/images/shows/"));
      let imageUrl: string | null = imgs[0] || null;
      if (imageUrl && imageUrl.includes("src=https://")) {
        const match = imageUrl.match(/src=(https:\/\/[^&]+)/);
        if (match) imageUrl = decodeURIComponent(match[1]);
      }

      const bodyText = document.body.innerText || "";
      const lines = bodyText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      // Extract performance date lines
      const perfLines: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        if (/@\s*$/.test(lines[i]) && lines[i + 1]) {
          perfLines.push(`${lines[i]} ${lines[i + 1]}`);
        } else if (/[A-Za-z]+,\s+[A-Za-z]{3}\s+\d{1,2}(?:st|nd|rd|th)?\s*@\s*\d{1,2}:\d{2}\s*(?:am|pm)/i.test(lines[i])) {
          perfLines.push(lines[i]);
        }
      }

      // Extract standard ticket price
      const priceMatch = bodyText.match(/\$(\d+(?:\.\d{2})?)\s*:?\s*Standard Ticket Price/i);
      const standardPriceText = priceMatch ? `$${priceMatch[1]}` : "$18.00";

      // Extract year hint (e.g. "2027")
      const yearMatch = bodyText.match(/20(2[6-9]|3\d)/);
      const yearHint = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear() + 1;

      // Extract Characters list
      const characters: string[] = [];
      const charIdx = lines.findIndex((l) => /^Characters:?$/i.test(l));
      if (charIdx !== -1) {
        for (let i = charIdx + 1; i < lines.length; i++) {
          const line = lines[i];
          if (
            line === "×" ||
            /^Select a Performance/i.test(line) ||
            /^Thank You/i.test(line) ||
            /^Connect to CYT/i.test(line)
          ) {
            break;
          }
          if (line.length > 0 && line.length < 80) {
            characters.push(line);
          }
        }
      }

      return {
        title,
        imageUrl,
        perfLines: Array.from(new Set(perfLines)),
        standardPriceText,
        yearHint,
        characters,
      };
    });

    results.push({
      url,
      title: detail.title,
      imageUrl: detail.imageUrl,
      performances: detail.perfLines.map((label) => ({
        label,
        startsAt: parsePerformanceDateTime(label, detail.yearHint),
      })),
      standardPriceCents: parsePriceCents(detail.standardPriceText),
      characters: detail.characters,
    });
  }

  return results;
}

async function scrapePublicClasses(page: import("@playwright/test").Page): Promise<ScrapedClassRow[]> {
  console.log(`\n[2/2] Visiting ${BASE_URL}/classes/ ...`);
  await page.goto(`${BASE_URL}/classes/`, { waitUntil: "domcontentloaded", timeout: 30000 });

  const rows = await page.evaluate(() => {
    const out: Array<{
      className: string;
      ageText: string;
      chapterText: string;
      location: string;
      day: string;
      timeSlot: string;
    }> = [];

    const trs = Array.from(document.querySelectorAll("table tr"));
    for (const tr of trs) {
      const cells = Array.from(tr.querySelectorAll("td")).map((td) =>
        (td.textContent || "").replace(/\s+/g, " ").trim()
      );
      if (cells.length >= 6 && cells[0] && !/^Class:/i.test(cells[0])) {
        out.push({
          className: cells[0],
          ageText: cells[1] || "",
          chapterText: cells[2] || "",
          location: cells[3] || "",
          day: cells[4] || "",
          timeSlot: cells[5] || "",
        });
      }
    }
    return out;
  });

  return rows.map((r) => {
    const ageMatch = r.ageText.match(/(\d+)\s*[-–]\s*(\d+)/);
    const sessionMatch = r.chapterText.match(/\(([^)]+)\)/);
    return {
      className: r.className,
      minAge: ageMatch ? parseInt(ageMatch[1], 10) : null,
      maxAge: ageMatch ? parseInt(ageMatch[2], 10) : null,
      sessionName: sessionMatch ? sessionMatch[1].trim() : "Winter 2027",
      location: r.location,
      day: r.day,
      timeSlot: r.timeSlot,
    };
  });
}

async function runAuthenticatedCapture(page: import("@playwright/test").Page) {
  console.log(`\n[Auth Mode] Opening ${BASE_URL}/login ...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });

  const envEmail = process.env.CYT_LEGACY_EMAIL;
  const envPass = process.env.CYT_LEGACY_PASSWORD;
  if (envEmail && envPass) {
    const emailInput = page.locator("input[type='email'], input[name*='email' i], input[name*='user' i]").first();
    const passInput = page.locator("input[type='password']").first();
    if ((await emailInput.count()) > 0 && (await passInput.count()) > 0) {
      await emailInput.fill(envEmail);
      await passInput.fill(envPass);
      const submitBtn = page.locator("button[type='submit'], input[type='submit']").first();
      if ((await submitBtn.count()) > 0) {
        await submitBtn.click();
      }
    }
  } else {
    console.log("  Please log in inside the open Chromium window (waiting up to 2 minutes)...");
  }

  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 120000 });
  console.log("  Logged in! Current URL:", page.url());

  const captured = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({
        text: (a.textContent || "").trim(),
        href: (a as HTMLAnchorElement).href,
      }))
      .filter((l) => l.text && l.href.startsWith("http"));
    return {
      url: window.location.href,
      title: document.title,
      links: links.slice(0, 120),
    };
  });

  const outPath = path.join(process.cwd(), "scripts", ".cytfred-auth-export.json");
  fs.writeFileSync(outPath, JSON.stringify(captured, null, 2), "utf8");
  console.log(`  Saved authenticated portal links to ${outPath}`);
}

async function main() {
  const browser = await chromium
    .launch({ headless: !AUTH_MODE, channel: "chrome" })
    .catch(() => chromium.launch({ headless: !AUTH_MODE }));
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    if (AUTH_MODE) {
      await runAuthenticatedCapture(page);
    }

    const shows = await scrapePublicShows(page);
    const classes = await scrapePublicClasses(page);

    console.log(`\nScraped ${shows.length} show detail page(s) and ${classes.length} class listing(s).`);

    if (DRY_RUN) {
      console.log("[dry-run] Shows:", JSON.stringify(shows, null, 2));
      console.log("[dry-run] Sample classes:", JSON.stringify(classes.slice(0, 5), null, 2));
      return;
    }

    const db = getDb();
    const [org] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, TENANT_SLUG))
      .limit(1);

    if (!org) throw new Error(`Organization "${TENANT_SLUG}" not found.`);

    // Clear accidental artwork on archived Frozen JR if it got the 2027 Frozen banner
    await db
      .update(schema.productions)
      .set({ showImageUrl: null })
      .where(
        and(
          eq(schema.productions.organizationId, org.id),
          eq(schema.productions.title, "Frozen JR")
        )
      );

    // Resolve active season (2026-2027) so current shows match 2026-2027 rows first
    const [activeSeason] = await db
      .select()
      .from(schema.seasons)
      .where(and(eq(schema.seasons.organizationId, org.id), eq(schema.seasons.name, "2026-2027")))
      .limit(1);

    // 1. Upsert show artwork, dates, ticket prices, performances, and blueprint character roles
    for (const s of shows) {
      const cleanTitle = s.title.split("—")[0].trim();

      // Prefer exact match in active 2026-2027 season, then newest production with exact/prefix title
      const candidates = await db
        .select()
        .from(schema.productions)
        .where(
          and(
            eq(schema.productions.organizationId, org.id),
            ilike(schema.productions.title, `%${cleanTitle}%`)
          )
        )
        .orderBy(desc(schema.productions.id));

      const prod =
        candidates.find(
          (c) => activeSeason && c.seasonId === activeSeason.id && c.title.toLowerCase() === cleanTitle.toLowerCase()
        ) ||
        candidates.find((c) => activeSeason && c.seasonId === activeSeason.id) ||
        candidates.find((c) => c.title.toLowerCase() === cleanTitle.toLowerCase()) ||
        candidates[0];

      if (!prod) {
        console.log(`  [skip show] No matching production row for "${s.title}"`);
        continue;
      }

      const sortedDates = s.performances
        .map((p) => p.startsAt)
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());

      const openingNight = sortedDates[0]?.toISOString().slice(0, 10) || prod.openingNight;
      const closingNight = sortedDates[sortedDates.length - 1]?.toISOString().slice(0, 10) || prod.closingNight;
      const ticketDollars = s.standardPriceCents / 100;

      await db
        .update(schema.productions)
        .set({
          showImageUrl: s.imageUrl || prod.showImageUrl,
          openingNight,
          closingNight,
          ticketPriceStandard: ticketDollars,
          updatedAt: new Date(),
        })
        .where(eq(schema.productions.id, prod.id));
      console.log(
        `  [show] Updated "${prod.title}" (#${prod.id}) — ${openingNight || "TBD"} to ${closingNight || "TBD"}, $${ticketDollars.toFixed(2)}`
      );

      // Upsert performances (avoid duplicating by label/date)
      const existingPerfs = await db
        .select()
        .from(schema.performances)
        .where(
          and(
            eq(schema.performances.organizationId, org.id),
            eq(schema.performances.productionId, prod.id)
          )
        );

      let addedPerfs = 0;
      for (const perf of s.performances) {
        if (!perf.startsAt) continue;
        const isoDate = perf.startsAt.toISOString();
        const alreadyExists = existingPerfs.some(
          (ep) => ep.performanceDate === isoDate || ep.label === perf.label
        );
        if (alreadyExists) continue;

        await db.insert(schema.performances).values({
          organizationId: org.id,
          productionId: prod.id,
          label: perf.label,
          performanceDate: isoDate,
          ticketPrice: ticketDollars,
          totalInventory: 300,
          salesOpen: true,
        });
        addedPerfs++;
      }
      console.log(
        `  [performances] "${prod.title}": added ${addedPerfs} new (${existingPerfs.length + addedPerfs} total)`
      );

      // Upsert master_show + blueprint_roles for characters
      if (s.characters.length > 0) {
        let masterShowId = prod.masterShowId;
        if (!masterShowId) {
          const [existingMaster] = await db
            .select()
            .from(schema.masterShows)
            .where(
              and(
                eq(schema.masterShows.organizationId, org.id),
                ilike(schema.masterShows.title, prod.title)
              )
            )
            .limit(1);
          if (existingMaster) {
            masterShowId = existingMaster.id;
          } else {
            const [createdMaster] = await db
              .insert(schema.masterShows)
              .values({ organizationId: org.id, title: prod.title })
              .returning();
            masterShowId = createdMaster.id;
          }
          await db
            .update(schema.productions)
            .set({ masterShowId })
            .where(eq(schema.productions.id, prod.id));
        }

        const existingRoles = await db
          .select({ roleName: schema.blueprintRoles.roleName })
          .from(schema.blueprintRoles)
          .where(
            and(
              eq(schema.blueprintRoles.organizationId, org.id),
              eq(schema.blueprintRoles.masterShowId, masterShowId)
            )
          );
        const roleSet = new Set(existingRoles.map((r) => r.roleName.toLowerCase()));

        let addedRoles = 0;
        for (const charName of s.characters) {
          if (roleSet.has(charName.toLowerCase())) continue;
          await db.insert(schema.blueprintRoles).values({
            organizationId: org.id,
            masterShowId,
            roleName: charName,
            roleType: "Character",
          });
          roleSet.add(charName.toLowerCase());
          addedRoles++;
        }
        console.log(`  [characters] "${prod.title}": added ${addedRoles} blueprint roles`);
      }
    }

    // 2. Upsert public Academy classes
    if (classes.length > 0) {
      const sessionCache = new Map<string, number>();
      const existingSessions = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.organizationId, org.id));
      for (const ses of existingSessions) {
        sessionCache.set(ses.name.toLowerCase(), ses.id);
      }

      const existingClasses = await db
        .select({
          className: schema.classes.className,
          sessionId: schema.classes.sessionId,
        })
        .from(schema.classes)
        .where(eq(schema.classes.organizationId, org.id));

      let addedClasses = 0;
      for (const cls of classes) {
        let sessionId = sessionCache.get(cls.sessionName.toLowerCase());
        if (!sessionId) {
          const [createdSession] = await db
            .insert(schema.sessions)
            .values({
              organizationId: org.id,
              seasonId: activeSeason?.id ?? null,
              name: cls.sessionName,
              isActive: true,
            })
            .returning();
          sessionId = createdSession.id;
          sessionCache.set(cls.sessionName.toLowerCase(), sessionId);
        }

        const exists = existingClasses.some(
          (ec) =>
            ec.sessionId === sessionId &&
            ec.className.toLowerCase() === cls.className.toLowerCase()
        );
        if (exists) continue;

        await db.insert(schema.classes).values({
          organizationId: org.id,
          sessionId,
          className: cls.className,
          location: cls.location,
          day: cls.day,
          timeSlot: cls.timeSlot,
          minAge: cls.minAge,
          maxAge: cls.maxAge,
          status: "Active",
        });
        existingClasses.push({ className: cls.className, sessionId });
        addedClasses++;
      }
      console.log(`  [classes] Added ${addedClasses} new class(es) from /classes/`);
    }

    console.log("\nLegacy sync complete!");
  } finally {
    await browser.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
