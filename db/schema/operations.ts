import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  real,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations, people } from "./core.ts";
import { productions } from "./productions.ts";
import { assignments } from "./casting.ts";

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    eventDate: text("event_date"),
    startTime: text("start_time"),
    endTime: text("end_time"),
    eventType: text("event_type"),
    isRequired: boolean("is_required").default(false),
    conflictAllowed: boolean("conflict_allowed").default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("events_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("events_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const scenes = pgTable(
  "scenes",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    sceneName: text("scene_name").notNull(),
    act: text("act"),
    sceneSize: text("scene_size"),
    minimumPerformers: integer("minimum_performers"),
    countsTowardMinimum: boolean("counts_toward_minimum").default(true),
    location: text("location"),
    sceneType: text("scene_type"),
    sortOrder: integer("sort_order").default(0),
    musicStatus: text("music_status"),
    danceStatus: text("dance_status"),
    blockingStatus: text("blocking_status"),
    musicLoad: real("music_load"),
    danceLoad: real("dance_load"),
    blockingLoad: real("blocking_load"),
    pages: text("pages"),
    blueprintRoleIds: integer("blueprint_role_ids").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("scenes_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("scenes_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const sceneAssignments = pgTable(
  "scene_assignments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    sceneId: integer("scene_id").references(() => scenes.id, { onDelete: "cascade" }),
    personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }),
    assignmentId: integer("assignment_id").references(() => assignments.id, {
      onDelete: "set null",
    }),
    countsTowardMinimum: boolean("counts_toward_minimum").default(true),
    notes: text("notes"),
    slotType: text("slot_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("scene_assignments_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("scene_assignments_org_prod_idx").on(table.organizationId, table.productionId),
    index("scene_assignments_org_scene_idx").on(table.organizationId, table.sceneId),
  ]
);

export const scheduleSlots = pgTable(
  "schedule_slots",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
    sceneId: integer("scene_id").references(() => scenes.id, { onDelete: "set null" }),
    name: text("name"),
    active: boolean("active").default(true),
    track: text("track"),
    startTime: text("start_time"),
    endTime: text("end_time"),
    duration: integer("duration"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("schedule_slots_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("schedule_slots_org_event_idx").on(table.organizationId, table.eventId),
  ]
);

export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    eventId: integer("event_id").references(() => events.id, { onDelete: "set null" }),
    personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }),
    checkedInById: integer("checked_in_by_id").references(() => people.id, {
      onDelete: "set null",
    }),
    checkInTime: text("check_in_time"),
    checkOutTime: text("check_out_time"),
    status: text("status"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("attendance_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("attendance_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const conflicts = pgTable(
  "conflicts",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    eventId: integer("event_id").references(() => events.id, { onDelete: "set null" }),
    personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }),
    conflictType: text("conflict_type"),
    minutesLateEarly: integer("minutes_late_early"),
    submittedVia: text("submitted_via"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("conflicts_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("conflicts_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const assets = pgTable(
  "assets",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    url: text("url"),
    type: text("type"),
    barcodeSku: text("barcode_sku"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("assets_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("assets_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const committeePrefs = pgTable(
  "committee_prefs",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    parentPersonId: integer("parent_person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    studentPersonId: integer("student_person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    preShow1: text("pre_show_1"),
    preShow2: text("pre_show_2"),
    preShow3: text("pre_show_3"),
    showWeek1: text("show_week_1"),
    showWeek2: text("show_week_2"),
    showWeek3: text("show_week_3"),
    chairInterest: text("chair_interest").array().notNull().default([]),
    notes: text("notes"),
    processed: boolean("processed").default(false),
    assignedPreShow: text("assigned_pre_show"),
    assignedShowWeek: text("assigned_show_week"),
    isChair: boolean("is_chair").default(false),
    ticketsSold: integer("tickets_sold").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("committee_prefs_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("committee_prefs_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const committeeReports = pgTable(
  "committee_reports",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    submitterId: integer("submitter_id").references(() => people.id, { onDelete: "set null" }),
    name: text("name"),
    committeeName: text("committee_name"),
    reportDate: text("report_date"),
    productionPhase: text("production_phase"),
    progressUpdate: text("progress_update"),
    attendanceNotes: text("attendance_notes"),
    blockersAndNeeds: text("blockers_and_needs"),
    estimatedCompletion: integer("estimated_completion"),
    moneySpentThisWeek: real("money_spent_this_week"),
    receiptUrls: jsonb("receipt_urls").$type<string[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("committee_reports_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("committee_reports_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);
