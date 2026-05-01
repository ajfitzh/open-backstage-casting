// app/lib/tenant-config.ts

export const TENANT_CONFIG = {
  cytfred: {
    tables: {
      CLASSES: process.env.NEXT_PUBLIC_CYTFRED_CLASSES_TABLE_ID || "REPLACE_WITH_ID",
      PEOPLE: process.env.NEXT_PUBLIC_CYTFRED_PEOPLE_TABLE_ID || "REPLACE_WITH_ID",
      VENUES: process.env.NEXT_PUBLIC_CYTFRED_VENUES_TABLE_ID || "REPLACE_WITH_ID",
      SPACES: process.env.NEXT_PUBLIC_CYTFRED_SPACES_TABLE_ID || "REPLACE_WITH_ID",
      RENTAL_RATES: process.env.NEXT_PUBLIC_CYTFRED_RENTAL_RATES_TABLE_ID || "REPLACE_WITH_ID",
      PRODUCTIONS: process.env.NEXT_PUBLIC_CYTFRED_PRODUCTIONS_TABLE_ID || "REPLACE_WITH_ID",
      SEASONS: process.env.NEXT_PUBLIC_CYTFRED_SEASONS_TABLE_ID || "REPLACE_WITH_ID",
      BLUEPRINT_ROLES: process.env.NEXT_PUBLIC_CYTFRED_BLUEPRINT_ROLES_TABLE_ID || "REPLACE_WITH_ID",
      ASSIGNMENTS: process.env.NEXT_PUBLIC_CYTFRED_ASSIGNMENTS_TABLE_ID || "REPLACE_WITH_ID",
      SCHEDULE_SLOTS: process.env.NEXT_PUBLIC_CYTFRED_SCHEDULE_SLOTS_TABLE_ID || "REPLACE_WITH_ID",
      SCENE_ASSIGNMENTS: process.env.NEXT_PUBLIC_CYTFRED_SCENE_ASSIGNMENTS_TABLE_ID || "REPLACE_WITH_ID",
      SCENES: process.env.NEXT_PUBLIC_CYTFRED_SCENES_TABLE_ID || "REPLACE_WITH_ID",
      EVENTS: process.env.NEXT_PUBLIC_CYTFRED_EVENTS_TABLE_ID || "REPLACE_WITH_ID",
      ASSETS: process.env.NEXT_PUBLIC_CYTFRED_ASSETS_TABLE_ID || "REPLACE_WITH_ID",
      SHOW_TEAM: process.env.NEXT_PUBLIC_CYTFRED_SHOW_TEAM_TABLE_ID || "REPLACE_WITH_ID",
      CONFLICTS: process.env.NEXT_PUBLIC_CYTFRED_CONFLICTS_TABLE_ID || "REPLACE_WITH_ID",
      COMMITTEE_PREFS: "620", // The hardcoded ID from your committees.ts
      AUDITIONS: process.env.NEXT_PUBLIC_CYTFRED_AUDITIONS_TABLE_ID || "REPLACE_WITH_ID",
      PERFORMANCES: process.env.NEXT_PUBLIC_CYTFRED_PERFORMANCES_TABLE_ID || "REPLACE_WITH_ID",
    }
  },
  // Add other tenants here as you expand...
  /* demo_tenant: {
    tables: { ... }
  }
  */
};

/**
 * Retrieves the specific Baserow Table IDs for the given tenant.
 * @param tenant The tenant subdomain or slug (e.g., 'cytfred')
 * @returns The table mapping object for that tenant.
 * @throws Error if the tenant is not found in the configuration.
 */
export function getTenantTableConfig(tenant: string) {
  const config = TENANT_CONFIG[tenant as keyof typeof TENANT_CONFIG];
  
  if (!config || !config.tables) {
    throw new Error(`[Tenant Config Error] Invalid or missing configuration for tenant: "${tenant}"`);
  }
  
  return config.tables;
}