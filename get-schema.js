// get-schema.js
// Run with: node --env-file=.env.local get-schema.js

const https = require('https');

// IDs fetched from your app/lib/baserow.ts
const TABLES = {
  PEOPLE: "599",
  ASSIGNMENTS: "603",
  ROLES: "605",
  SCENES: "627",
  AUDITIONS: "630",
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