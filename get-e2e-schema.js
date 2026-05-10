// get-e2e-schema.js
const fs = require('fs');
const path = require('path');

// 🟢 Mapped exactly to your e2e Tenant Registry IDs!
// get-e2e-schema.js

// 🟢 Mapped exactly to your e2e Tenant Registry IDs!
const TABLES = {
  PEOPLE: "844",
  PRODUCTIONS: "845",
  MASTER_SHOW_DB: "846",
  ASSIGNMENTS: "847",
  BLUEPRINT_ROLES: "848",
  SIGNATURES: "849",
  PROD_STATS: "850",
  STAFF_POSITIONS: "851",
  SHOW_TEAM: "852",
  MEASUREMENTS: "853",
  GARMENT_INVENTORY: "854",
  STUDENT_BIO: "855",
  COMMITTEE_PREFS: "856",
  ATTENDANCE: "857",
  CONFLICTS: "858",
  REQUIREMENTS: "859",
  EVENTS: "860",
  SCENES: "861",
  SCENE_ASSIGNMENTS: "862",
  AUDITIONS: "863",
  ASSETS: "864",
  SESSIONS: "865",
  CLASSES: "866",
  FAMILIES: "867",
  VENUES: "868",
  SEATS: "869",
  PERFORMANCES: "870",
  SPACES: "871",
  RENTAL_RATES: "872",
  SCHEDULE_SLOTS: "873",
  SEASONS: "874",           // Added
  STAFF_INTEREST: "875",    // Added
  TENANT_REGISTRY: "876",   // Added
  AUDITION_SLOTS: "877",    // 🟢 FIXED: Now correctly points to 877
  COMMITTEE_REPORTS: "878"  // 🟢 FIXED: Now correctly points to 878
};

const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(/\/$/, "");
// 🟢 CRITICAL: We use the Sandbox token to read the Sandbox schema!
const TOKEN = process.env.SANDBOX_BASEROW_TOKEN;

function sanitizeKey(name) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

async function fetchFields(tableId, tableName) {
  const url = `${BASE_URL}/api/database/fields/table/${tableId}/`;
  try {
    const res = await fetch(url, { headers: { 'Authorization': `Token ${TOKEN}` } });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

(async () => {
  if (!TOKEN) {
      console.error("❌ FATAL: No SANDBOX_BASEROW_TOKEN found in .env.local.");
      process.exit(1);
  }

  console.log(`🚀 Starting E2E Schema Sync from ${BASE_URL}...`);
  
  let fileContent = `// --------------------------------------------------------
// 🚨 AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
//    Generated on: ${new Date().toLocaleString()}
// --------------------------------------------------------

export const E2E_DB = {`;

  for (const [name, id] of Object.entries(TABLES)) {
    process.stdout.write(`Syncing ${name.padEnd(20)}... `);
    const fields = await fetchFields(id, name);
    
    if (fields) {
      fileContent += `\n  ${name}: {
    ID: "${id}",
    FIELDS: {`;
      fields.forEach(f => {
        fileContent += `\n      "${sanitizeKey(f.name)}": "field_${f.id}",`;
      });
      fileContent += `\n    }\n  },`;
      console.log('✅');
    } else {
      console.log('❌');
    }
  }

  fileContent += `\n};\n`;

  // 🟢 Outputs to a dedicated E2E file!
  const outputPath = path.join(process.cwd(), 'app', 'lib', 'schema-e2e.ts');
  fs.writeFileSync(outputPath, fileContent);

  console.log(`\n✨ SUCCESS: app/lib/schema-e2e.ts has been generated!`);
})();