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

export const masterShows = pgTable(
  "master_shows",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    title: text("title").notNull(),
    licensor: text("licensor"),
    minimumCast: integer("minimum_cast"),
    maximumCast: integer("maximum_cast"),
    vocalDifficulty: integer("vocal_difficulty"),
    royaltyEstimate: real("royalty_estimate"),
    brandStrength: real("brand_strength"),
    staffingTier: text("staffing_tier"),
    contentTags: text("content_tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("master_shows_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("master_shows_org_idx").on(table.organizationId),
  ]
);

export const seasons = pgTable(
  "seasons",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    name: text("name").notNull(),
    startDate: text("start_date"),
    endDate: text("end_date"),
    status: text("status"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("seasons_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("seasons_org_idx").on(table.organizationId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    seasonId: integer("season_id").references(() => seasons.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    startDate: text("start_date"),
    endDate: text("end_date"),
    isActive: boolean("is_active").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sessions_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("sessions_org_idx").on(table.organizationId),
  ]
);

export const venues = pgTable(
  "venues",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    name: text("name").notNull(),
    marketingName: text("marketing_name"),
    chapters: text("chapters"),
    seatingCapacity: integer("seating_capacity"),
    locationNotes: text("location_notes"),
    address: text("address"),
    seatingChartUrl: text("seating_chart_url"),
    type: text("type"),
    contactName: text("contact_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("venues_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("venues_org_idx").on(table.organizationId),
  ]
);

export const spaces = pgTable(
  "spaces",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
    roomName: text("room_name").notNull(),
    capacity: integer("capacity"),
    floorType: text("floor_type"),
    squareFootage: integer("square_footage"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("spaces_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("spaces_org_venue_idx").on(table.organizationId, table.venueId),
  ]
);

export const rentalRates = pgTable(
  "rental_rates",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
    sessionId: integer("session_id").references(() => sessions.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    flatRate: real("flat_rate"),
    hourlyRate: real("hourly_rate"),
    weekendRate: real("weekend_rate"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("rental_rates_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("rental_rates_org_idx").on(table.organizationId),
  ]
);

export const seats = pgTable(
  "seats",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    venueId: integer("venue_id").references(() => venues.id, { onDelete: "cascade" }),
    section: text("section"),
    rowLabel: text("row_label"),
    seatNumber: integer("seat_number"),
    status: text("status"),
    gridX: integer("grid_x"),
    gridY: integer("grid_y"),
  },
  (table) => [
    uniqueIndex("seats_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("seats_org_venue_idx").on(table.organizationId, table.venueId),
  ]
);

export const productions = pgTable(
  "productions",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    masterShowId: integer("master_show_id").references(() => masterShows.id, {
      onDelete: "set null",
    }),
    seasonId: integer("season_id").references(() => seasons.id, { onDelete: "set null" }),
    sessionId: integer("session_id").references(() => sessions.id, { onDelete: "set null" }),
    venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),

    title: text("title").notNull(),
    sessionLabel: text("session_label"),
    type: text("type"),
    status: text("status").default("Planning"),
    location: text("location"),
    ticketPriceStandard: real("ticket_price_standard"),
    ticketPriceAtDoor: real("ticket_price_at_door"),
    productionFee: real("production_fee"),
    showImageUrl: text("show_image_url"),
    legacyPerformancesJson: text("legacy_performances_json"),
    castListHtml: text("cast_list_html"),
    castPublishedAt: timestamp("cast_published_at", { withTimezone: true }),
    allowResellers: boolean("allow_resellers").default(false),
    historicalCastSize: integer("historical_cast_size"),
    workflowOverrides: text("workflow_overrides").array().notNull().default([]),

    firstRehearsalDate: text("first_rehearsal_date"),
    techWeekStart: text("tech_week_start"),
    openingNight: text("opening_night"),
    closingNight: text("closing_night"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("productions_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("productions_org_status_idx").on(table.organizationId, table.status),
  ]
);

export const performances = pgTable(
  "performances",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    label: text("label"),
    performanceDate: text("performance_date"),
    doorsOpenAt: text("doors_open_at"),
    ticketPrice: real("ticket_price"),
    salesOpen: boolean("sales_open").default(true).notNull(),
    totalInventory: integer("total_inventory").default(0),
    ticketsSold: integer("tickets_sold").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("performances_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("performances_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const ticketOrders = pgTable(
  "ticket_orders",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    productionId: integer("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    performanceId: integer("performance_id")
      .notNull()
      .references(() => performances.id, { onDelete: "cascade" }),
    referredByPersonId: integer("referred_by_person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    buyerName: text("buyer_name").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    status: text("status").notNull().default("pending"),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ticket_orders_stripe_session_uidx").on(table.stripeSessionId),
    index("ticket_orders_org_perf_idx").on(table.organizationId, table.performanceId),
    index("ticket_orders_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);

export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    orderId: integer("order_id")
      .notNull()
      .references(() => ticketOrders.id, { onDelete: "cascade" }),
    productionId: integer("production_id")
      .notNull()
      .references(() => productions.id, { onDelete: "cascade" }),
    performanceId: integer("performance_id")
      .notNull()
      .references(() => performances.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    qrCodeValue: text("qr_code_value").notNull(),
    holderName: text("holder_name"),
    status: text("status").notNull().default("valid"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInBy: text("checked_in_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tickets_org_code_uidx").on(table.organizationId, table.code),
    index("tickets_org_order_idx").on(table.organizationId, table.orderId),
    index("tickets_org_perf_idx").on(table.organizationId, table.performanceId),
  ]
);

export const staffPositions = pgTable(
  "staff_positions",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    roleName: text("role_name").notNull(),
    department: text("department"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("staff_positions_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("staff_positions_org_idx").on(table.organizationId),
  ]
);

export const showTeam = pgTable(
  "show_team",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }),
    positionId: integer("position_id").references(() => staffPositions.id, {
      onDelete: "set null",
    }),
    status: text("status").default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("show_team_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("show_team_org_prod_idx").on(table.organizationId, table.productionId),
    index("show_team_org_person_idx").on(table.organizationId, table.personId),
  ]
);

export const staffInterest = pgTable(
  "staff_interest",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    baserowId: integer("baserow_id"),
    personId: integer("person_id").references(() => people.id, { onDelete: "cascade" }),
    seasonId: integer("season_id").references(() => seasons.id, { onDelete: "set null" }),
    name: text("name"),
    availability: jsonb("availability").$type<Record<string, unknown>>(),
    preferredPositionIds: integer("preferred_position_ids").array().notNull().default([]),
    constraints: text("constraints"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("staff_interest_org_baserow_uidx").on(table.organizationId, table.baserowId),
    index("staff_interest_org_season_idx").on(table.organizationId, table.seasonId),
  ]
);

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    productionId: integer("production_id").references(() => productions.id, {
      onDelete: "cascade",
    }),
    code: text("code").notNull(),
    discountType: text("discount_type").notNull().default("percent"), // "percent" | "fixed" | "comp"
    discountValue: real("discount_value").notNull().default(0),
    maxUses: integer("max_uses"),
    currentUses: integer("current_uses").notNull().default(0),
    active: boolean("active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("promo_codes_org_code_uidx").on(table.organizationId, table.code),
    index("promo_codes_org_prod_idx").on(table.organizationId, table.productionId),
  ]
);
