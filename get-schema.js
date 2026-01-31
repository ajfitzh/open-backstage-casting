// get-schema.js
// Run with: node --env-file=.env.local get-schema.js

const https = require('https');

// IDs updated based on your provided list
const TABLES = {
  PEOPLE: "599",
  PRODUCTIONS: "600",
  MASTER_SHOW_DB: "601",
  ASSIGNMENTS: "603",    // Cast/Crew Assignments
  ROLES: "605",          // Blueprint Roles
  SIGNATURES: "607",
  STATS: "608",
  ROLES_POSITIONS: "609",
  TEAM_ASSIGNMENTS: "610",
  MEASUREMENTS: "616",
  GARMENT_INVENTORY: "617",
  STUDENT_BIO: "618",
  COMMITTEE_PREFS: "620",
  ATTENDANCE: "622",
  CONFLICTS: "623",      // Rehearsal Event Conflicts
  REQUIREMENTS: "624",
  EVENTS: "625",         // Rehearsal/Production Events (The Parent Container)
  SCENES: "627",
  SCENE_ASSIGNMENTS: "628",
  AUDITIONS: "630",
  RESOURCES: "631",
  SESSIONS: "632",
  CLASSES: "633",
  FAMILIES: "634",
  VENUES: "635",
  SEATS: "636",
  PERFORMANCES: "637",
  SPACES: "638",
  RATES: "639",
  SLOTS: "640",          // Schedule Slots (The Child/Time Blocks)
};

const BASE_URL = process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io";
const TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN;

// Remove trailing slash if present for the fetch URL
const CLEAN_BASE_URL = BASE_URL.replace(/\/$/, "");

async function fetchFields(tableId, tableName) {
  const url = `${CLEAN_BASE_URL}/api/database/fields/table/${tableId}/`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Token ${TOKEN}`
      }
    });

    if (!res.ok) {
        console.error(`\n❌ Error fetching ${tableName} (${tableId}): ${res.status} ${res.statusText}`);
        return { table: tableName, fields: ["ERROR_FETCHING"] };
    }

    const fields = await res.json();
    // Simplify output to just Name + Type + ID (Tokens save space)
    const simplified = fields.map(f => `${f.name} (ID: field_${f.id}, Type: ${f.type})`);
    return { table: tableName, id: tableId, fields: simplified };

  } catch (e) {
    console.error(`\n❌ Network Error for ${tableName}:`, e.message);
    return { table: tableName, fields: ["NETWORK_ERROR"] };
  }
}

(async () => {
  if (!TOKEN) {
      console.error("❌ FATAL: No Token found. Make sure .env.local exists and has NEXT_PUBLIC_BASEROW_TOKEN.");
      process.exit(1);
  }

  console.log("--- BASEROW SCHEMA CONTEXT ---");
  console.log(`Target: ${CLEAN_BASE_URL}`);
  
  for (const [name, id] of Object.entries(TABLES)) {
    const data = await fetchFields(id, name);
    if (data.fields[0] !== "ERROR_FETCHING") {
        console.log(`\nTABLE: ${name} (ID: ${id})`);
        console.log(data.fields.join("\n"));
    }
  }
  console.log("\n--- END CONTEXT ---");
})();