import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema/index.ts";

export type OpenBackstageDb = NeonHttpDatabase<typeof schema>;

let cachedDb: OpenBackstageDb | null = null;
let cachedUrl: string | null = null;

/**
 * Returns true when PostgreSQL (Neon) is configured and not explicitly disabled
 * via DATA_BACKEND=baserow.
 */
export function isPostgresEnabled(): boolean {
  if (process.env.DATA_BACKEND?.trim().toLowerCase() === "baserow") {
    return false;
  }
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * Lazily initializes and caches the Neon HTTP Drizzle client so Next.js builds
 * cleanly even when DATABASE_URL is not set in the build environment.
 */
export function getDb(): OpenBackstageDb {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. Add your Neon PostgreSQL connection string to .env.local."
    );
  }

  if (cachedDb && cachedUrl === url) {
    return cachedDb;
  }

  const sql = neon(url);
  cachedDb = drizzle(sql, { schema });
  cachedUrl = url;
  return cachedDb;
}

export { schema };
