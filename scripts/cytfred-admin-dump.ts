/**
 * CYT Fredericksburg MyCYT Admin Portal Dumper (Read-Only)
 *
 * Opens a visible Chrome window to https://www.cytfredericksburg.org/login/admin,
 * waits for you to log in (and complete MFA if prompted), and then immediately
 * crawls the MyCYT Admin modules in that exact same authenticated browser session:
 *   - Sessions (/admin/session_edit)
 *   - Theaters & Class Locations (/admin/locations?type=1, type=2)
 *   - Seating Chart Codes (/admin/seating-chart-codes)
 *   - Shows (/admin/search_shows + show detail/cast/performance links)
 *   - Classes & Camps (/admin/search_classes_camps, /admin/classes)
 *   - Family Accounts (/admin/search_accounts)
 *   - Individual Users (/admin/search_users)
 *
 * Saves everything locally to gitignored `scripts/.cytfred-admin-dump.json`
 * so we can inspect the exact schema and run idempotent PostgreSQL imports
 * without having to log in again.
 *
 * Usage:
 *   npm run dump:cytfred-admin
 */

import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const BASE_URL = "https://www.cytfredericksburg.org";
const OUT_PATH = path.join(process.cwd(), "scripts", ".cytfred-admin-dump.json");

interface CapturedResponse {
  url: string;
  status: number;
  contentType: string;
  bodyPreview: string;
  bodyLength: number;
}

interface ExtractedTable {
  id: string;
  className: string;
  headers: string[];
  rowCount: number;
  rows: {
    cells: string[];
    links: { text: string; href: string }[];
    imgs: string[];
  }[];
}

interface PageSnapshot {
  name: string;
  requestedUrl: string;
  finalUrl: string;
  title: string;
  headings: string[];
  forms: {
    action: string;
    method: string;
    inputs: { tag: string; type: string; name: string; id: string; placeholder: string; value: string }[];
    selects: { name: string; id: string; optionCount: number; sampleOptions: { value: string; text: string }[] }[];
    buttons: { text: string; type: string; id: string; className: string }[];
  }[];
  tables: ExtractedTable[];
  actionLinks: { text: string; href: string }[];
  xhrResponses: CapturedResponse[];
}

async function expandDataTablesAndSearch(page: Page) {
  // 1. If there is a DataTables length selector (e.g. "Show 10 entries"), pick the largest option or -1 ("All")
  const expandedLength = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll("select")) as HTMLSelectElement[];
    for (const sel of selects) {
      const nameOrId = `${sel.name} ${sel.id} ${sel.className}`.toLowerCase();
      if (nameOrId.includes("length") || nameOrId.includes("per_page") || nameOrId.includes("limit")) {
        const opts = Array.from(sel.options);
        const allOpt = opts.find((o) => o.value === "-1" || /all/i.test(o.text));
        const maxNumOpt = opts
          .filter((o) => /^\d+$/.test(o.value))
          .sort((a, b) => Number(b.value) - Number(a.value))[0];
        const pick = allOpt || maxNumOpt;
        if (pick && sel.value !== pick.value) {
          sel.value = pick.value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          return pick.text;
        }
      }
    }
    return null;
  });
  if (expandedLength) {
    console.log(`    Expanded table page size to "${expandedLength}"`);
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle").catch(() => {});
  }

  // 2. If the page has a search form with an empty table (0 tbody rows), try clicking the primary Search button
  const tbodyRows = await page.evaluate(() => document.querySelectorAll("table tbody tr").length);
  if (tbodyRows === 0) {
    const searchBtn = page
      .locator("button:has-text('Search'), input[type='submit'][value*='Search' i], button[type='submit']")
      .first();
    if ((await searchBtn.count()) > 0 && (await searchBtn.isVisible().catch(() => false))) {
      console.log("    No initial table rows — clicking Search button to load results...");
      await searchBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }
}

async function snapshotPage(
  page: Page,
  name: string,
  urlPath: string,
  maxRowsPerTable = 2500
): Promise<PageSnapshot> {
  const fullUrl = urlPath.startsWith("http") ? urlPath : `${BASE_URL}${urlPath}`;
  console.log(`\n[Dump] Visiting ${name}: ${fullUrl}`);

  const xhrResponses: CapturedResponse[] = [];
  const onResponse = async (res: import("@playwright/test").Response) => {
    try {
      const req = res.request();
      const rt = req.resourceType();
      if (rt !== "xhr" && rt !== "fetch") return;
      const u = res.url();
      if (!u.includes("cytfredericksburg.org")) return;
      const ct = res.headers()["content-type"] || "";
      const txt = await res.text().catch(() => "");
      xhrResponses.push({
        url: u,
        status: res.status(),
        contentType: ct,
        bodyLength: txt.length,
        bodyPreview: txt.slice(0, 4000),
      });
    } catch {
      // ignore closed response streams
    }
  };

  page.on("response", onResponse);
  try {
    await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await expandDataTablesAndSearch(page);

    const extracted = await page.evaluate((maxRows) => {
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
        .map((h) => (h.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 30);

      const forms = Array.from(document.querySelectorAll("form"))
        .filter((f) => !f.classList.contains("hny-pt-form"))
        .map((f) => ({
          action: f.getAttribute("action") || "",
          method: (f.getAttribute("method") || "GET").toUpperCase(),
          inputs: Array.from(f.querySelectorAll("input, textarea"))
            .filter((el) => (el as HTMLInputElement).type !== "hidden")
            .slice(0, 30)
            .map((el) => {
              const inp = el as HTMLInputElement;
              return {
                tag: el.tagName.toLowerCase(),
                type: inp.type || "",
                name: inp.name || "",
                id: inp.id || "",
                placeholder: inp.placeholder || "",
                value: inp.value || "",
              };
            }),
          selects: Array.from(f.querySelectorAll("select"))
            .slice(0, 20)
            .map((s) => ({
              name: s.name || "",
              id: s.id || "",
              optionCount: s.options.length,
              sampleOptions: Array.from(s.options)
                .slice(0, 40)
                .map((o) => ({ value: o.value, text: o.text.trim() })),
            })),
          buttons: Array.from(f.querySelectorAll("button, input[type='submit'], input[type='button']"))
            .slice(0, 15)
            .map((b) => ({
              text: ((b as HTMLInputElement).value || b.textContent || "").replace(/\s+/g, " ").trim(),
              type: (b as HTMLButtonElement).type || "",
              id: b.id || "",
              className: b.className || "",
            })),
        }));

      const tables = Array.from(document.querySelectorAll("table")).map((t) => {
        const headers = Array.from(t.querySelectorAll("thead th, tr:first-child th")).map((th) =>
          (th.textContent || "").replace(/\s+/g, " ").trim()
        );
        const bodyRows = Array.from(t.querySelectorAll("tbody tr"));
        const targetRows = bodyRows.length > 0 ? bodyRows : Array.from(t.querySelectorAll("tr")).slice(1);
        const rows = targetRows.slice(0, maxRows).map((tr) => ({
          cells: Array.from(tr.querySelectorAll("td, th")).map((td) =>
            (td.textContent || "").replace(/\s+/g, " ").trim()
          ),
          links: Array.from(tr.querySelectorAll("a[href]")).map((a) => ({
            text: (a.textContent || "").replace(/\s+/g, " ").trim(),
            href: (a as HTMLAnchorElement).href,
          })),
          imgs: Array.from(tr.querySelectorAll("img[src]")).map((img) => (img as HTMLImageElement).src),
        }));
        return {
          id: t.id || "",
          className: t.className || "",
          headers,
          rowCount: targetRows.length,
          rows,
        };
      });

      const actionLinks = Array.from(
        document.querySelectorAll("main a[href], .content a[href], #content a[href], .container a[href]")
      )
        .map((a) => ({
          text: (a.textContent || "").replace(/\s+/g, " ").trim(),
          href: (a as HTMLAnchorElement).href,
        }))
        .filter(
          (l) =>
            l.text &&
            l.href.includes("/admin/") &&
            !l.href.endsWith("/admin/#") &&
            !l.href.endsWith("/admin/")
        )
        .slice(0, 150);

      return {
        finalUrl: window.location.href,
        title: document.title,
        headings,
        forms,
        tables,
        actionLinks,
      };
    }, maxRowsPerTable);

    const totalRows = extracted.tables.reduce((sum, t) => sum + t.rowCount, 0);
    console.log(
      `  ✓ ${name}: ${extracted.tables.length} table(s), ${totalRows} row(s), ${xhrResponses.length} XHR(s) -> ${extracted.finalUrl}`
    );

    return {
      name,
      requestedUrl: fullUrl,
      ...extracted,
      xhrResponses,
    };
  } finally {
    page.off("response", onResponse);
  }
}

async function main() {
  const browser = await chromium
    .launch({ headless: false, channel: "chrome" })
    .catch(() => chromium.launch({ headless: false }));
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    console.log(`\n[1/2] Opening ${BASE_URL}/login/admin ...`);
    await page.goto(`${BASE_URL}/login/admin`, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("  Please log in (and complete MFA if prompted) in the open Chrome window.");
    console.log("  Tip: click directly into username & password fields (avoid browser autofill).");
    console.log("  Waiting up to 5 minutes...");

    await page.waitForURL(
      (url) => url.pathname.startsWith("/admin") && !url.pathname.includes("/login"),
      { timeout: 300000 }
    );
    console.log(`\n✓ Logged in! Starting read-only crawl in the same Chrome window...`);
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    const targets: [string, string][] = [
      ["sessions", "/admin/session_edit"],
      ["theaters", "/admin/locations?type=1"],
      ["class_locations", "/admin/locations?type=2"],
      ["seating_charts", "/admin/seating-chart-codes"],
      ["shows", "/admin/search_shows"],
      ["classes_search", "/admin/search_classes_camps"],
      ["classes_saved", "/admin/classes"],
      ["family_accounts", "/admin/search_accounts"],
      ["individual_users", "/admin/search_users"],
    ];

    const pages: Record<string, PageSnapshot> = {};
    for (const [name, urlPath] of targets) {
      pages[name] = await snapshotPage(page, name, urlPath);
    }

    // Also inspect the first show detail link (if found in shows table) so we know the exact show/cast/performance tabs!
    const sampleShowDetails: PageSnapshot[] = [];
    const showLinks = new Set<string>();
    for (const t of pages.shows?.tables || []) {
      for (const r of t.rows) {
        for (const l of r.links) {
          if (l.href.includes("/admin/") && !l.href.includes("search_shows")) {
            showLinks.add(l.href);
          }
        }
      }
    }
    const sampleUrls = Array.from(showLinks).slice(0, 3);
    for (let i = 0; i < sampleUrls.length; i++) {
      sampleShowDetails.push(await snapshotPage(page, `sample_show_${i + 1}`, sampleUrls[i], 300));
    }

    const dump = {
      dumpedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      pages,
      sampleShowDetails,
    };

    fs.writeFileSync(OUT_PATH, JSON.stringify(dump, null, 2), "utf8");
    const sizeKb = Math.round(fs.statSync(OUT_PATH).size / 1024);

    console.log(`\n========================================`);
    console.log(`✓ Admin dump complete! Saved ${sizeKb} KB to:`);
    console.log(`  ${OUT_PATH}`);
    console.log(`========================================`);
    for (const [name, snap] of Object.entries(pages)) {
      const totalRows = snap.tables.reduce((sum, t) => sum + t.rowCount, 0);
      console.log(
        `  - ${name.padEnd(18)} | tables: ${snap.tables.length} | rows: ${String(totalRows).padStart(4)} | XHRs: ${snap.xhrResponses.length}`
      );
    }
    console.log(`  - sampleShowDetails  | ${sampleShowDetails.length} sampled`);
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
