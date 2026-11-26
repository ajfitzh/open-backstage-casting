import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  real,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations, people } from "./core.ts";
import { sessions, spaces } from "./productions.ts";

export const measurements = pgTable(
  "measurements",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }),
    measuredAt: text("measured_at"),
    height: real("height"),
    chest: real("chest"),
    waist: real("waist"),
    hips: real("hips"),
    inseam: real("inseam"),
    girth: real("girth"),
    neck: real("neck"),
    hatHead: real("hat_head"),
    shoeSize: real("shoe_size"),
    gloveSize: text("glove_size"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("measurements_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("measurements_org_person_idx").on(table.organizationId, table.personId),
  ]
);

export const garmentInventory = pgTable(
  "garment_inventory",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    sku: text("sku").notNull(),
    qrCodeValue: text("qr_code_value"),
    photoUrl: text("photo_url"),
    category: text("category"),
    binLocation: text("bin_location"),
    chest: real("chest"),
    waist: real("waist"),
    hips: real("hips"),
    inseam: real("inseam"),
    girth: real("girth"),
    neck: real("neck"),
    hatHead: real("hat_head"),
    shoeSize: real("shoe_size"),
    gloveSize: text("glove_size"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("garment_inventory_org_baserow_uidx").on(table.organizationId, table.baserowId),
    uniqueIndex("garment_inventory_org_sku_uidx").on(table.organizationId, table.sku),
    index("garment_inventory_org_cat_idx").on(table.organizationId, table.category),
  ]
);

export const classes = pgTable(
  "classes",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    sessionId: integer("session_id").references(() => sessions.id, { onDelete: "set null" }),
    teacherId: integer("teacher_id").references(() => people.id, { onDelete: "set null" }),
    spaceId: integer("space_id").references(() => spaces.id, { onDelete: "set null" }),
    className: text("class_name").notNull(),
    location: text("location"),
    day: text("day"),
    timeSlot: text("time_slot"),
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    type: text("type"),
    isCoreCurriculum: boolean("is_core_curriculum").default(false),
    status: text("status").default("Active"),
    description: text("description"),
    objectives: text("objectives"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("classes_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("classes_org_session_idx").on(table.organizationId, table.sessionId),
  ]
);

export const classEnrollments = pgTable(
  "class_enrollments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("class_enrollments_org_class_student_uidx").on(
      table.organizationId,
      table.classId,
      table.studentId
    ),
    index("class_enrollments_org_student_idx").on(table.organizationId, table.studentId),
  ]
);
