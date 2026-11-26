// app/lib/data-client.ts
// Clean PostgreSQL-first data layer entry point for Open Backstage.
// Prefer importing from here for new features rather than legacy Baserow filenames.

export { isPostgresEnabled, getDb, schema } from "@/db";
export { BaserowClient as DataClient } from "./BaserowClient";
export * from "./db/core-repo";
export * from "./db/productions-repo";
export * from "./db/casting-repo";
export * from "./db/operations-repo";
export * from "./db/wardrobe-academy-repo";
