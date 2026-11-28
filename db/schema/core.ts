import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export interface AuthorizedPickupEntry {
  name: string;
  relationship?: string;
  phone?: string;
}

export interface OrganizationSettings {
  primaryColor?: string;
  logoUrl?: string;
  contactEmail?: string;
  websiteUrl?: string;
  timezone?: string;
  waiverText?: string;
  committeeTemplates?: string[];
  venueCostEstimates?: Record<string, number>;
  committeeTargetsByShow?: Record<string, Record<string, number>>;
}

export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    organizationType: text("organization_type").default("Theater"),
    plan: text("plan").notNull().default("starter"),
    isHidden: boolean("is_hidden").notNull().default(false),
    settings: jsonb("settings").$type<OrganizationSettings>().default({}),
    baserowRegistryId: integer("baserow_registry_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organizations_slug_uidx").on(table.slug),
    uniqueIndex("organizations_baserow_registry_uidx").on(table.baserowRegistryId),
  ]
);

export const families = pgTable(
  "families",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    name: text("name"),
    email: text("email"),
    externalFamilyId: text("external_family_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("families_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("families_org_email_idx").on(table.organizationId, table.email),
  ]
);

export const people = pgTable(
  "people",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    familyId: integer("family_id").references(() => families.id, { onDelete: "set null" }),

    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    fullName: text("full_name").notNull().default(""),
    email: text("email"),
    secondaryEmail: text("secondary_email"),
    familyEmail: text("family_email"),
    phone: text("phone"),
    dateOfBirth: text("date_of_birth"),
    gender: text("gender"),
    headshotUrl: text("headshot_url"),
    heightInches: integer("height_inches"),

    roles: text("roles").array().notNull().default([]),
    passwordHash: text("password_hash"),
    attendanceStatus: text("attendance_status"),
    editedBio: text("edited_bio"),

    parent1Id: integer("parent_1_id").references((): AnyPgColumn => people.id, {
      onDelete: "set null",
    }),
    parent2Id: integer("parent_2_id").references((): AnyPgColumn => people.id, {
      onDelete: "set null",
    }),
    parent3Id: integer("parent_3_id").references((): AnyPgColumn => people.id, {
      onDelete: "set null",
    }),

    address: text("address"),
    secondaryAddress: text("secondary_address"),
    city: text("city"),
    state: text("state"),
    zipcode: text("zipcode"),

    tylenolApproval: boolean("tylenol_approval").default(false),
    ibuprofenApproval: boolean("ibuprofen_approval").default(false),
    medicalNotes: text("medical_notes"),
    medicalProvider: text("medical_provider"),
    medicalInsurance: text("medical_insurance"),
    medicalPhone: text("medical_phone"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),

    school: text("school"),
    placeOfWorship: text("place_of_worship"),
    friendRequest: text("friend_request"),
    tShirtSize: text("t_shirt_size"),
    photoRelease: boolean("photo_release").default(false),
    authorizedPickup: jsonb("authorized_pickup").$type<AuthorizedPickupEntry[]>().default([]),

    externalUserId: text("external_user_id"),
    externalFamilyAccount: text("external_family_account"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("people_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("people_org_email_idx").on(table.organizationId, table.email),
    index("people_org_secondary_email_idx").on(table.organizationId, table.secondaryEmail),
    index("people_org_family_idx").on(table.organizationId, table.familyId),
  ]
);

export const organizationOnboardingRequests = pgTable(
  "organization_onboarding_requests",
  {
    id: serial("id").primaryKey(),
    organizationName: text("organization_name").notNull(),
    requestedSlug: text("requested_slug").notNull(),
    organizationType: text("organization_type").default("Theater"),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    createdOrganizationId: integer("created_organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("org_onboarding_slug_idx").on(table.requestedSlug),
    index("org_onboarding_email_idx").on(table.contactEmail),
  ]
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    personId: integer("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    purpose: text("purpose").notNull().default("reset"), // "reset" | "invite"
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("password_reset_tokens_org_email_idx").on(table.organizationId, table.email),
    index("password_reset_tokens_person_idx").on(table.personId),
  ]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorEmail: text("actor_email").notNull(),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_org_created_idx").on(table.organizationId, table.createdAt),
    index("audit_logs_org_action_idx").on(table.organizationId, table.action),
  ]
);
