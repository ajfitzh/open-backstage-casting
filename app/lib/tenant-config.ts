// app/lib/tenant-config.ts

const MASTER_REGISTRY_TABLE_ID = process.env.NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID; 
const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const API_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;

// 🟢 THE BYPASS: A safe dummy configuration for non-tenant routes
const SYSTEM_DUMMY_CONFIG = {
    PEOPLE: "0", PRODUCTIONS: "0", ASSIGNMENTS: "0", COMMITTEE_PREFS: "0",
    CONFLICTS: "0", EVENTS: "0", SCENES: "0", SCENE_ASSIGNMENTS: "0",
    AUDITIONS: "0", CLASSES: "0", VENUES: "0", PERFORMANCES: "0",
    SPACES: "0", RENTAL_RATES: "0", SEASONS: "0", BLUEPRINT_ROLES: "0",
    SCHEDULE_SLOTS: "0", ASSETS: "0", SHOW_TEAM: "0", MASTER_SHOW_DB: "0",
    SIGNATURES: "0", STATS: "0", ROLES_POSITIONS: "0", MEASUREMENTS: "0",
    GARMENT_INVENTORY: "0", STUDENT_BIO: "0", ATTENDANCE: "0",
    REQUIREMENTS: "0", FAMILIES: "0", SEATS: "0",
};

export async function getTenantTableConfig(tenantSlug: string) {
  if (!MASTER_REGISTRY_TABLE_ID) {
    throw new Error("Missing NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID");
  }

  // 🟢 1. CATCH MARKETING & SYSTEM ROUTES
  // If the middleware feeds us (marketing), return the dummy config to prevent a crash
  if (!tenantSlug || tenantSlug === "(marketing)" || tenantSlug === "marketing" || tenantSlug === "www") {
    return SYSTEM_DUMMY_CONFIG;
  }

  const url = `${BASE_URL}/api/database/rows/table/${MASTER_REGISTRY_TABLE_ID}/?filter__Slug__equal=${tenantSlug}&user_field_names=true`;

  const res = await fetch(url, {
    headers: { "Authorization": `Token ${API_TOKEN}` },
    next: { revalidate: 3600 } 
  });

  if (!res.ok) throw new Error(`Failed to fetch tenant registry for ${tenantSlug}`);

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`[Tenant Config Error] Tenant "${tenantSlug}" not found in Master Registry.`);
  }

  const tenantRow = data.results[0];

  // Perfectly mapped to your specific schema keys, while aliasing to match baserow.ts
  return {
    // Direct matches
    PEOPLE: tenantRow.PEOPLE || null,
    PRODUCTIONS: tenantRow.PRODUCTIONS || null,
    ASSIGNMENTS: tenantRow.ASSIGNMENTS || null,
    COMMITTEE_PREFS: tenantRow.COMMITTEE_PREFS || null,
    CONFLICTS: tenantRow.CONFLICTS || null,
    EVENTS: tenantRow.EVENTS || null,
    SCENES: tenantRow.SCENES || null,
    SCENE_ASSIGNMENTS: tenantRow.SCENE_ASSIGNMENTS || null,
    AUDITIONS: tenantRow.AUDITIONS || null,
    CLASSES: tenantRow.CLASSES || null,
    VENUES: tenantRow.VENUES || null,
    PERFORMANCES: tenantRow.PERFORMANCES || null,
    SPACES: tenantRow.SPACES || null,

    // ALIASES (These fix the TypeScript errors!)
    RENTAL_RATES: tenantRow.RATES || null,
    SEASONS: tenantRow.SESSIONS || null,
    BLUEPRINT_ROLES: tenantRow.ROLES || null,
    SCHEDULE_SLOTS: tenantRow.SLOTS || null,
    ASSETS: tenantRow.RESOURCES || null,
    SHOW_TEAM: tenantRow.TEAM_ASSIGNMENTS || null,

    // Extras you might need later
    MASTER_SHOW_DB: tenantRow.MASTER_SHOW_DB || null,
    SIGNATURES: tenantRow.SIGNATURES || null,
    STATS: tenantRow.STATS || null,
    ROLES_POSITIONS: tenantRow.ROLES_POSITIONS || null,
    MEASUREMENTS: tenantRow.MEASUREMENTS || null,
    GARMENT_INVENTORY: tenantRow.GARMENT_INVENTORY || null,
    STUDENT_BIO: tenantRow.STUDENT_BIO || null,
    ATTENDANCE: tenantRow.ATTENDANCE || null,
    REQUIREMENTS: tenantRow.REQUIREMENTS || null,
    FAMILIES: tenantRow.FAMILIES || null,
    SEATS: tenantRow.SEATS || null,
  };
}