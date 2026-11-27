/**
 * CYT Fredericksburg MyCYT Full Admin Exporter (Read-Only)
 *
 * Opens a visible Chrome window to https://www.cytfredericksburg.org/login/admin.
 * Immediately after you sign in, it uses that exact authenticated browser session
 * to call MyCYT's internal `_ajax_load` endpoints and pull:
 *   1. All Shows across all sessions (+ each show's Artistic Team, Performances,
 *      Characters/Cast, Crew/Non-Character roles, Auditionees, and Banner artwork)
 *   2. All Theaters & Class Locations (including street addresses)
 *   3. All Classes across all sessions
 *   4. All Individual Users (names, emails, ages, headshots, family IDs)
 *   5. All Family Accounts
 *
 * Saves structured JSON locally to gitignored `scripts/.cytfred-full-export.json`.
 *
 * Usage:
 *   npm run export:cytfred-admin
 */

import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const BASE_URL = "https://www.cytfredericksburg.org";
const OUT_PATH = path.join(process.cwd(), "scripts", ".cytfred-full-export.json");

async function browserFetchText(page: Page, relUrl: string): Promise<string> {
  return await page.evaluate(async (url) => {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return "";
    return await res.text();
  }, relUrl);
}

async function parseHtmlInBrowser<T>(
  page: Page,
  html: string,
  fnSource: string
): Promise<T> {
  return await page.evaluate(
    ({ rawHtml, code }) => {
      const wrap = document.createElement("div");
      // Wrap bare <tr> rows in a <table> so DOMParser doesn't strip them
      if (/^\s*<tr[\s>]/i.test(rawHtml)) {
        wrap.innerHTML = `<table><tbody>${rawHtml}</tbody></table>`;
      } else {
        wrap.innerHTML = rawHtml;
      }
      const fn = new Function("root", code);
      return fn(wrap);
    },
    { rawHtml: html, code: fnSource }
  );
}

async function main() {
  const browser = await chromium
    .launch({ headless: false, channel: "chrome" })
    .catch(() => chromium.launch({ headless: false }));
  const context = await browser.newContext({ viewport: { width: 1360, height: 860 } });
  const page = await context.newPage();

  try {
    console.log(`\n[1/6] Opening ${BASE_URL}/login/admin ...`);
    await page.goto(`${BASE_URL}/login/admin`, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("  Please log in (and complete MFA if prompted) in the open Chrome window.");
    console.log("  Tip: click directly into username & password fields (avoid browser autofill).");

    await page.waitForURL(
      (url) => url.pathname.startsWith("/admin") && !url.pathname.includes("/login"),
      { timeout: 300000 }
    );
    console.log("✓ Logged in! Starting fast in-browser API extraction...\n");

    // -------------------------------------------------------------------------
    // 1. Discover all Sessions from /admin/search_shows dropdown
    // -------------------------------------------------------------------------
    await page.goto(`${BASE_URL}/admin/search_shows`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    const sessions = await page.evaluate(() => {
      const sel =
        (document.querySelector("select[name*='session' i], select[id*='session' i]") as HTMLSelectElement) ||
        Array.from(document.querySelectorAll("select")).find((s) =>
          Array.from(s.options).some((o) => /fall|winter|spring|summer/i.test(o.text))
        );
      if (!sel) return [];
      return Array.from(sel.options)
        .map((o) => ({ id: o.value.trim(), name: o.text.replace(/\s+/g, " ").trim() }))
        .filter((o) => o.id && o.id !== "" && o.name);
    });
    console.log(`[2/6] Found ${sessions.length} session option(s) in dropdown.`);

    // -------------------------------------------------------------------------
    // 2. Pull ALL Shows (try session=0 first; if few results, iterate all sessions)
    // -------------------------------------------------------------------------
    const showMap = new Map<
      number,
      {
        mycytId: number;
        title: string;
        venue: string;
        sessionName: string;
        chapter: string;
      }
    >();

    const extractShowsFromHtml = async (html: string, fallbackSession: string) => {
      const rows = await parseHtmlInBrowser<
        { mycytId: number; title: string; venue: string; sessionName: string; chapter: string }[]
      >(
        page,
        html,
        `
        return Array.from(root.querySelectorAll("tr.showListing")).map(tr => {
          const idMatch = (tr.id || "").match(/(\\d+)/);
          const tds = Array.from(tr.querySelectorAll("td"));
          const td0 = tds[0];
          const title = (td0?.querySelector("u")?.textContent || td0?.textContent?.split("\\n")[0] || "").trim();
          const td0Lines = (td0?.innerText || td0?.textContent || "").split(/\\n+/).map(s => s.trim()).filter(Boolean);
          const venue = td0Lines.length > 1 ? td0Lines[td0Lines.length - 1] : "";
          const td1Lines = (tds[1]?.innerText || tds[1]?.textContent || "").split(/\\n+/).map(s => s.trim()).filter(Boolean);
          return {
            mycytId: idMatch ? Number(idMatch[1]) : 0,
            title,
            venue: venue === title ? "" : venue,
            sessionName: td1Lines[0] || "",
            chapter: td1Lines[1] || ""
          };
        }).filter(r => r.mycytId > 0);
        `
      );
      for (const r of rows) {
        if (!r.sessionName) r.sessionName = fallbackSession;
        showMap.set(r.mycytId, r);
      }
    };

    const allShowsHtml0 = await browserFetchText(
      page,
      "/_ajax_load/show-listing-admin?session=0&area=0&location=0"
    );
    await extractShowsFromHtml(allShowsHtml0, "");

    if (showMap.size < 10 && sessions.length > 0) {
      console.log(`  session=0 returned ${showMap.size} show(s); querying all ${sessions.length} sessions...`);
      for (const ses of sessions) {
        if (ses.id === "0") continue;
        const html = await browserFetchText(
          page,
          `/_ajax_load/show-listing-admin?session=${encodeURIComponent(ses.id)}&area=0&location=0`
        );
        if (html.includes("showListing")) {
          await extractShowsFromHtml(html, ses.name);
        }
      }
    }
    const showsList = Array.from(showMap.values()).sort((a, b) => b.mycytId - a.mycytId);
    console.log(`[3/6] Found ${showsList.length} total show(s) in MyCYT! Pulling details for each...`);

    const detailedShows: any[] = [];
    for (let i = 0; i < showsList.length; i++) {
      const sh = showsList[i];
      const [artHtml, perfHtml, charHtml, crewHtml, audHtml, settingsHtml] = await Promise.all([
        browserFetchText(page, `/_ajax_load/artistic-team-listing-admin?show=${sh.mycytId}`),
        browserFetchText(page, `/_ajax_load/performance-listing-admin?show=${sh.mycytId}`),
        browserFetchText(page, `/_ajax_load/show-character-listing-admin?show=${sh.mycytId}`),
        browserFetchText(page, `/_ajax_load/show-non-character-listing-admin?show=${sh.mycytId}`),
        browserFetchText(page, `/_ajax_load/audition-listing-admin?show=${sh.mycytId}`),
        browserFetchText(page, `/admin/new_show?show=${sh.mycytId}`),
      ]);

      const artisticTeam = await parseHtmlInBrowser<{ role: string; name: string }[]>(
        page,
        artHtml,
        `
        return Array.from(root.querySelectorAll(".form-group")).map(fg => {
          const cols = Array.from(fg.querySelectorAll("div")).map(d => (d.textContent || "").replace(/\\s+/g, " ").trim());
          return { role: cols[0] || "", name: cols[1] || "" };
        }).filter(x => x.role && x.name);
        `
      );

      const performances = await parseHtmlInBrowser<
        { performanceId: number; dateLabel: string; totalTickets: number; totalSold: number }[]
      >(
        page,
        perfHtml,
        `
        return Array.from(root.querySelectorAll("tr")).map(tr => {
          const tds = Array.from(tr.querySelectorAll("td")).map(td => (td.textContent || "").replace(/\\s+/g, " ").trim());
          const btn = tr.querySelector("button[id^='editPerformanceButton_']");
          const idMatch = (btn?.id || "").match(/(\\d+)/);
          return {
            performanceId: idMatch ? Number(idMatch[1]) : 0,
            dateLabel: tds[0] || "",
            totalTickets: parseInt(tds[1] || "0", 10) || 0,
            totalSold: parseInt(tds[2] || "0", 10) || 0
          };
        }).filter(p => p.dateLabel);
        `
      );

      const characters = await parseHtmlInBrowser<{ role: string; actors: string[] }[]>(
        page,
        charHtml,
        `
        return Array.from(root.querySelectorAll("tr.characterRow")).map(tr => {
          const tds = Array.from(tr.querySelectorAll("td"));
          const role = (tds[1]?.textContent || "").replace(/\\s+/g, " ").trim();
          const actorsRaw = (tds[2]?.textContent || "").replace(/\\s+/g, " ").trim();
          const actors = actorsRaw ? actorsRaw.split(/\\s*,\\s*/).map(s => s.trim()).filter(Boolean) : [];
          return { role, actors };
        }).filter(c => c.role);
        `
      );

      const crewRoles = await parseHtmlInBrowser<{ role: string; members: string[] }[]>(
        page,
        crewHtml,
        `
        return Array.from(root.querySelectorAll("tr.nonCharacterRow")).map(tr => {
          const tds = Array.from(tr.querySelectorAll("td"));
          const role = (tds[1]?.textContent || "").replace(/\\s+/g, " ").trim();
          const membersRaw = (tds[2]?.textContent || "").replace(/\\s+/g, " ").trim();
          const members = membersRaw ? membersRaw.split(/\\s*,\\s*/).map(s => s.trim()).filter(Boolean) : [];
          return { role, members };
        }).filter(c => c.role);
        `
      );

      const auditionees = await parseHtmlInBrowser<
        {
          mycytPersonId: number;
          slotLabel: string;
          headshotUrl: string | null;
          firstName: string;
          lastName: string;
          email: string;
          age: string;
          dob: string;
          shirtSize: string;
          gender: string;
        }[]
      >(
        page,
        audHtml,
        `
        return Array.from(root.querySelectorAll("tr[id^='auditioner_']")).map(tr => {
          const idMatch = (tr.id || "").match(/(\\d+)/);
          const tds = Array.from(tr.querySelectorAll("td"));
          const img = tds[1]?.querySelector("img")?.getAttribute("src") || "";
          let headshotUrl = img || null;
          if (headshotUrl && headshotUrl.includes("src=https://")) {
            const m = headshotUrl.match(/src=(https:\\/\\/[^&]+)/);
            if (m) headshotUrl = decodeURIComponent(m[1]);
          }
          return {
            mycytPersonId: idMatch ? Number(idMatch[1]) : 0,
            slotLabel: (tds[0]?.textContent || "").trim(),
            headshotUrl,
            firstName: (tds[2]?.textContent || "").trim(),
            lastName: (tds[3]?.textContent || "").trim(),
            email: (tds[4]?.textContent || "").trim(),
            age: (tds[5]?.textContent || "").trim(),
            dob: (tds[6]?.textContent || "").trim(),
            shirtSize: (tds[7]?.textContent || "").trim(),
            gender: (tds[8]?.textContent || "").trim()
          };
        }).filter(a => a.firstName || a.lastName);
        `
      );

      // Extract banner image URL from settings page HTML
      let bannerUrl: string | null = null;
      const imgMatch = settingsHtml.match(/https:\/\/www\.cytfredericksburg\.org\/_local\/images\/shows\/[^"'&\s<>]+/i);
      if (imgMatch) {
        bannerUrl = imgMatch[0];
      } else {
        const relImgMatch = settingsHtml.match(/\/_local\/images\/shows\/[^"'&\s<>]+/i);
        if (relImgMatch) bannerUrl = `${BASE_URL}${relImgMatch[0]}`;
      }

      detailedShows.push({
        ...sh,
        bannerUrl,
        artisticTeam,
        performances,
        characters,
        crewRoles,
        auditionees,
      });

      if ((i + 1) % 10 === 0 || i === showsList.length - 1) {
        console.log(
          `  [${i + 1}/${showsList.length}] "${sh.title}" (${sh.sessionName}) — ${performances.length} perfs, ${characters.length} roles, ${auditionees.length} auditionees, ${artisticTeam.length} team`
        );
      }
    }

    // -------------------------------------------------------------------------
    // 3. Pull ALL Theaters (type=1) & Class Locations (type=2) + Addresses
    // -------------------------------------------------------------------------
    console.log(`\n[4/6] Pulling Theaters & Class Locations...`);
    const locations: { mycytId: number; kind: string; name: string; address: string; city: string; state: string; zip: string }[] = [];
    for (const [kind, typeNum] of [
      ["theater", 1],
      ["class_location", 2],
    ] as const) {
      await page.goto(`${BASE_URL}/admin/locations?type=${typeNum}`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      // Expand DataTables if present
      await page.evaluate(() => {
        const sel = document.querySelector("select[name*='length']") as HTMLSelectElement | null;
        if (sel) {
          const pick = Array.from(sel.options).find((o) => o.value === "-1" || o.value === "100") || sel.options[sel.options.length - 1];
          if (pick) {
            sel.value = pick.value;
            sel.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      });
      await page.waitForTimeout(800);
      const locLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a[href*='location_edit?location=']")).map((a) => ({
          href: (a as HTMLAnchorElement).href,
          rowName: (a.closest("tr")?.querySelector("td")?.textContent || "").replace(/\s+/g, " ").trim(),
        }))
      );
      for (const ll of locLinks) {
        const idMatch = ll.href.match(/location=(\d+)/);
        const locId = idMatch ? Number(idMatch[1]) : 0;
        if (!locId) continue;
        const html = await browserFetchText(page, `/admin/location_edit?location=${locId}`);
        const parsed = await parseHtmlInBrowser<{ name: string; address: string; city: string; state: string; zip: string }>(
          page,
          html,
          `
          const val = (sel) => (root.querySelector(sel)?.getAttribute("value") || root.querySelector(sel)?.value || "").trim();
          return {
            name: val("input[name*='name' i], input[id*='name' i]"),
            address: val("input[name*='address' i], input[id*='address' i]"),
            city: val("input[name*='city' i], input[id*='city' i]"),
            state: val("input[name*='state' i], select[name*='state' i]"),
            zip: val("input[name*='zip' i], input[id*='zip' i]")
          };
          `
        );
        locations.push({
          mycytId: locId,
          kind,
          name: parsed.name || ll.rowName,
          address: parsed.address,
          city: parsed.city,
          state: parsed.state,
          zip: parsed.zip,
        });
      }
    }
    console.log(`  ✓ Pulled ${locations.length} location(s).`);

    // -------------------------------------------------------------------------
    // 4. Pull ALL Classes (session=0 or across all sessions)
    // -------------------------------------------------------------------------
    console.log(`\n[5/6] Pulling Classes...`);
    const classMap = new Map<number, any>();
    const parseClassesHtml = async (html: string, sessionLabel: string) => {
      const rows = await parseHtmlInBrowser<any[]>(
        page,
        html,
        `
        return Array.from(root.querySelectorAll("tr.classListing")).map(tr => {
          const idMatch = (tr.id || "").match(/(\\d+)/);
          const tds = Array.from(tr.querySelectorAll("td"));
          const name = (tds[0]?.textContent || "").replace(/\\s+/g, " ").trim();
          const enrollment = (tds[1]?.textContent || "").replace(/\\s+/g, " ").trim();
          const chapter = (tds[2]?.textContent || "").replace(/\\s+/g, " ").trim();
          const timeSlot = (tds[3]?.innerText || tds[3]?.textContent || "").replace(/\\s+/g, " ").trim();
          const ages = (tds[4]?.textContent || "").replace(/\\s+/g, " ").trim();
          const teacherEmail = (tds[5]?.textContent || "").replace(/\\s+/g, " ").trim();
          return { mycytId: idMatch ? Number(idMatch[1]) : 0, name, enrollment, chapter, timeSlot, ages, teacherEmail };
        }).filter(c => c.mycytId > 0);
        `
      );
      for (const r of rows) {
        classMap.set(r.mycytId, { ...r, sessionName: sessionLabel });
      }
    };

    const classHtml0 = await browserFetchText(
      page,
      "/_ajax_load/class_listing_admin?session=0&area=0&location=0&timeSlot=0&minAge=0&maxAge=0&day=0&gender=0&teacher=0"
    );
    await parseClassesHtml(classHtml0, "");
    if (classMap.size < 20 && sessions.length > 0) {
      // Pull most recent 12 sessions
      for (const ses of sessions.slice(0, 12)) {
        if (ses.id === "0") continue;
        const html = await browserFetchText(
          page,
          `/_ajax_load/class_listing_admin?session=${encodeURIComponent(ses.id)}&area=0&location=0&timeSlot=0&minAge=0&maxAge=0&day=0&gender=0&teacher=0`
        );
        if (html.includes("classListing")) {
          await parseClassesHtml(html, ses.name);
        }
      }
    }
    const classesList = Array.from(classMap.values());
    console.log(`  ✓ Pulled ${classesList.length} class(es).`);

    // -------------------------------------------------------------------------
    // 5. Pull ALL Individual Users (session=0 -> entire directory!)
    // -------------------------------------------------------------------------
    console.log(`\n[6/6] Pulling Individual Users directory (session=0)...`);
    const usersHtml = await browserFetchText(
      page,
      "/_ajax_load/user-listing-admin2?pageName=searchUsers&session=0&area=0&location=0&show=0&class=0&gender=0&minAge=0&maxAge=0&teachersOnly=n&showFilterCast=n&showFilterCrew=n&listFilterTeachersOnly=n&listFilterArtisticOnly=n&listFilterGuardiansOnly=n"
    );
    const users = await parseHtmlInBrowser<any[]>(
      page,
      usersHtml,
      `
      return Array.from(root.querySelectorAll("tr")).map(tr => {
        const tds = Array.from(tr.querySelectorAll("td"));
        if (tds.length < 5) return null;
        const firstName = (tds[0]?.textContent || "").trim();
        const lastName = (tds[1]?.textContent || "").trim();
        if (!firstName && !lastName) return null;
        const photoLink = tds[2]?.querySelector("a")?.getAttribute("href") || tds[2]?.querySelector("img")?.getAttribute("src") || null;
        const age = (tds[3]?.textContent || "").trim();
        const email = (tds[4]?.textContent || "").trim();
        const editHref = tr.querySelector("a[href*='user/members']")?.getAttribute("href") || "";
        const uMatch = editHref.match(/[?&]u=(\\d+)/);
        const pMatch = editHref.match(/[?&]p=(\\d+)/);
        return {
          mycytFamilyId: uMatch ? Number(uMatch[1]) : null,
          mycytPersonId: pMatch ? Number(pMatch[1]) : null,
          firstName,
          lastName,
          headshotUrl: photoLink,
          age,
          email
        };
      }).filter(Boolean);
      `
    );
    console.log(`  ✓ Pulled ${users.length} individual user record(s).`);

    const fullExport = {
      exportedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      sessions,
      locations,
      shows: detailedShows,
      classes: classesList,
      users,
    };

    fs.writeFileSync(OUT_PATH, JSON.stringify(fullExport, null, 2), "utf8");
    const sizeMb = (fs.statSync(OUT_PATH).size / (1024 * 1024)).toFixed(2);

    console.log(`\n================================================`);
    console.log(`✓ FULL MYCYT EXPORT COMPLETE! (${sizeMb} MB)`);
    console.log(`  File: ${OUT_PATH}`);
    console.log(`  Sessions:   ${sessions.length}`);
    console.log(`  Locations:  ${locations.length}`);
    console.log(`  Shows:      ${detailedShows.length}`);
    console.log(`  Classes:    ${classesList.length}`);
    console.log(`  Users:      ${users.length}`);
    console.log(`================================================\n`);
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
