// get-schema.js
// Run with: node --env-file=.env.local get-schema.js

const fs = require('fs');
const path = require('path');

// Updated IDs from your latest registry
// Note: Keys matched to app/lib/schema.ts to prevent breaking existing code
const TABLES = {
  PEOPLE: "599",
  PRODUCTIONS: "600",
  MASTER_SHOW_DB: "601",
  ASSIGNMENTS: "603",
  BLUEPRINT_ROLES: "605",
  SIGNATURES: "607",
  PROD_STATS: "608",
  STAFF_POSITIONS: "609",
  SHOW_TEAM: "610",
  MEASUREMENTS: "616",
  GARMENT_INVENTORY: "617",
  STUDENT_BIO: "618",
  COMMITTEE_PREFS: "620",
  ATTENDANCE: "622",
  CONFLICTS: "623",
  REQUIREMENTS: "624",
  EVENTS: "625",
  SCENES: "627",
  SCENE_ASSIGNMENTS: "628",
  AUDITIONS: "630",
  ASSETS: "631",
  SESSIONS: "632",
  CLASSES: "633",
  FAMILIES: "634",
  VENUES: "635",
  SEATS: "636",
  PERFORMANCES: "637",
  SPACES: "638",
  RENTAL_RATES: "639",
  SCHEDULE_SLOTS: "640",
  SEASONS: "641",
  STAFF_INTEREST: "642",
  TENANT_REGISTRY: "771"
};

const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
const TOKEN = process.env.NEXT_PUBLIC_BASEROW_TOKEN;

/**
 * Sanitizes a field name into a valid Screaming Snake Case key
 */
function sanitizeKey(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

async function fetchFields(tableId, tableName) {
  const url = `${BASE_URL}/api/database/fields/table/${tableId}/`;
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Token ${TOKEN}` }
    });
    if (!res.ok) {
        console.error(`❌ Error fetching ${tableName} (${tableId}): ${res.status}`);
        return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`❌ Network Error for ${tableName}:`, e.message);
    return null;
  }
}

(async () => {
  if (!TOKEN) {
      console.error("❌ FATAL: No Token found. Make sure .env.local exists and has NEXT_PUBLIC_BASEROW_TOKEN.");
      process.exit(1);
  }

  console.log(`🚀 Starting Schema Sync from ${BASE_URL}...`);
  
  let fileContent = `// --------------------------------------------------------
// 🚨 AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
//    Generated on: ${new Date().toLocaleString()}
//    Run \`node --env-file=.env.local get-schema.js\` to update.
// --------------------------------------------------------

export const DB = {`;

  for (const [name, id] of Object.entries(TABLES)) {
    process.stdout.write(`Syncing ${name.padEnd(20)}... `);
    const fields = await fetchFields(id, name);
    
    if (fields) {
      fileContent += `\n  ${name}: {
    ID: "${id}",
    FIELDS: {`;
      
      fields.forEach(f => {
        const key = sanitizeKey(f.name);
        fileContent += `\n      "${key}": "field_${f.id}", // ${f.type}`;
      });

      fileContent += `\n    }
  },`;
      console.log('✅');
    } else {
      console.log('❌');
    }
  }

  fileContent += `\n};`;

  const outputPath = path.join(process.cwd(), 'app', 'lib', 'schema.ts');
  fs.writeFileSync(outputPath, fileContent);

  console.log(`\n✨ SUCCESS: app/lib/schema.ts has been updated!`);
})();