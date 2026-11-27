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
import { masterShows, productions } from "./productions.ts";

export const blueprintRoles = pgTable(
  "blueprint_roles",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    masterShowId: integer("master_show_id").references(() => masterShows.id, {
      onDelete: "cascade",
    }),
    roleName: text("role_name").notNull(),
    roleType: text("role_type"),
    castingConstraints: text("casting_constraints"),
    vocalRange: text("vocal_range"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("blueprint_roles_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("blueprint_roles_org_show_idx").on(table.organizationId, table.masterShowId),
  ]
);

export const auditionSlots = pgTable(
  "audition_slots",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    timeLabel: text("time_label").notNull(),
    dateTime: text("date_time"),
    capacity: integer("capacity").notNull().default(12),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("audition_slots_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("audition_slots_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const auditions = pgTable(
  "auditions",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    performerId: integer("performer_id").references(() => people.id, { onDelete: "cascade" }),
    slotId: integer("slot_id").references(() => auditionSlots.id, { onDelete: "set null" }),

    vocalScore: real("vocal_score"),
    actingScore: real("acting_score"),
    stagePresenceScore: real("stage_presence_score"),
    danceScore: real("dance_score"),

    actingNotes: text("acting_notes"),
    choreographyNotes: text("choreography_notes"),
    musicNotes: text("music_notes"),
    dropInNotes: text("drop_in_notes"),
    adminNotes: text("admin_notes"),
    lobbyNote: text("lobby_note"),

    auditionDate: text("audition_date"),
    song: text("song"),
    monologue: text("monologue"),
    vocalRange: text("vocal_range"),
    voiceType: text("voice_type"),
    auditionVideoUrl: text("audition_video_url"),
    danceVideoUrl: text("dance_video_url"),
    callbackVideoUrl: text("callback_video_url"),
    backingTrackUrl: text("backing_track_url"),

    checkedIn: boolean("checked_in").default(false),
    commitmentToCharacter: boolean("commitment_to_character").default(false),
    paidFees: boolean("paid_fees").default(false),
    productionFeeStatus: text("production_fee_status"),
    measurementsTaken: boolean("measurements_taken").default(false),

    grade: text("grade"),
    hairColor: text("hair_color"),
    acceptAnyRole: boolean("accept_any_role").default(false),
    offBookAgreement: boolean("off_book_agreement").default(false),
    parentHelpAgreement: boolean("parent_help_agreement").default(false),
    signaturesText: text("signatures_text"),

    programBio: text("program_bio"),
    congratsAdText: text("congrats_ad_text"),
    castPartyRsvp: text("cast_party_rsvp"),
    scriptScoreNumber: text("script_score_number"),
    auditionNumber: text("audition_number"),
    status: text("status").default("Pending"),
    callbackStatus: text("callback_status"),

    willingToAlterAppearance: boolean("willing_to_alter_appearance").default(false),
    fearOfHeights: boolean("fear_of_heights").default(false),
    otherTalents: text("other_talents"),
    referralSource: text("referral_source"),
    preferredRoles: text("preferred_roles"),
    stageRomance: boolean("stage_romance").default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("auditions_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("auditions_org_prod_idx").on(table.organizationId, table.productionId),
    index("auditions_org_performer_idx").on(table.organizationId, table.performerId),
    index("auditions_org_slot_idx").on(table.organizationId, table.slotId),
  ]
);

export const assignments = pgTable(
  "assignments",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    personId: integer("person_id").references(() => people.id, { onDelete: "set null" }),
    roleId: integer("role_id").references(() => blueprintRoles.id, { onDelete: "set null" }),
    auditionId: integer("audition_id").references(() => auditions.id, { onDelete: "set null" }),
    castTrack: text("cast_track").default("All"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("assignments_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("assignments_org_prod_idx").on(table.organizationId, table.productionId),
    index("assignments_org_person_idx").on(table.organizationId, table.personId),
  ]
);

export const signatures = pgTable(
  "signatures",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    personId: integer("person_id").references(() => people.id, { onDelete: "set null" }),
    parentSignerName: text("parent_signer_name"),
    signerEmail: text("signer_email"),
    docType: text("doc_type"),
    initials: text("initials"),
    signedAt: text("signed_at"),
    performerBio: text("performer_bio"),
    congratsAd: text("congrats_ad"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("signatures_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("signatures_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const studentBios = pgTable(
  "student_bios",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "set null",
    }),
    personId: integer("person_id").references(() => people.id, { onDelete: "set null" }),
    studentFirstName: text("student_first_name"),
    studentLastName: text("student_last_name"),
    dateOfBirth: text("date_of_birth"),
    preferredName: text("preferred_name"),
    guardianFirstName: text("guardian_first_name"),
    guardianLastName: text("guardian_last_name"),
    guardianEmail: text("guardian_email"),
    guardianPhone: text("guardian_phone"),
    priorExperience: text("prior_experience"),
    medicalNotes: text("medical_notes"),
    processed: boolean("processed").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("student_bios_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("student_bios_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const auditionJudgeScores = pgTable(
  "audition_judge_scores",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    productionId: integer("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    auditionId: integer("audition_id")
      .notNull()
      .references(() => auditions.id, { onDelete: "cascade" }),
    judgePersonId: integer("judge_person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    judgeEmail: text("judge_email").notNull(),
    judgeName: text("judge_name").notNull(),
    judgeRole: text("judge_role").notNull().default("Judge"),
    round: text("round").notNull().default("audition"), // "audition" | "callback"
    vocalScore: real("vocal_score"),
    actingScore: real("acting_score"),
    danceScore: real("dance_score"),
    stagePresenceScore: real("stage_presence_score"),
    callbackVote: text("callback_vote"), // "strong_yes" | "yes" | "maybe" | "no"
    suggestedRoles: text("suggested_roles"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("audition_judge_scores_unique_ballot_uidx").on(
      table.organizationId,
      table.auditionId,
      table.judgeEmail,
      table.round
    ),
    index("audition_judge_scores_org_prod_idx").on(table.organizationId, table.productionId),
    index("audition_judge_scores_audition_idx").on(table.auditionId),
  ]
);
