CREATE TABLE "families" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"name" text,
	"email" text,
	"external_family_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_onboarding_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_name" text NOT NULL,
	"requested_slug" text NOT NULL,
	"organization_type" text DEFAULT 'Theater',
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_organization_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"organization_type" text DEFAULT 'Theater',
	"plan" text DEFAULT 'starter' NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"baserow_registry_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"family_id" integer,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"email" text,
	"secondary_email" text,
	"family_email" text,
	"phone" text,
	"date_of_birth" text,
	"gender" text,
	"headshot_url" text,
	"height_inches" integer,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"password_hash" text,
	"attendance_status" text,
	"edited_bio" text,
	"parent_1_id" integer,
	"parent_2_id" integer,
	"parent_3_id" integer,
	"address" text,
	"secondary_address" text,
	"city" text,
	"state" text,
	"zipcode" text,
	"tylenol_approval" boolean DEFAULT false,
	"ibuprofen_approval" boolean DEFAULT false,
	"medical_notes" text,
	"medical_provider" text,
	"medical_insurance" text,
	"medical_phone" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"school" text,
	"place_of_worship" text,
	"friend_request" text,
	"t_shirt_size" text,
	"photo_release" boolean DEFAULT false,
	"authorized_pickup" jsonb DEFAULT '[]'::jsonb,
	"external_user_id" text,
	"external_family_account" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"title" text NOT NULL,
	"licensor" text,
	"minimum_cast" integer,
	"maximum_cast" integer,
	"vocal_difficulty" integer,
	"royalty_estimate" real,
	"brand_strength" real,
	"staffing_tier" text,
	"content_tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performances" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"label" text,
	"performance_date" text,
	"total_inventory" integer DEFAULT 0,
	"tickets_sold" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"master_show_id" integer,
	"season_id" integer,
	"session_id" integer,
	"venue_id" integer,
	"title" text NOT NULL,
	"session_label" text,
	"type" text,
	"status" text DEFAULT 'Planning',
	"location" text,
	"ticket_price_standard" real,
	"ticket_price_at_door" real,
	"production_fee" real,
	"show_image_url" text,
	"legacy_performances_json" text,
	"cast_list_html" text,
	"allow_resellers" boolean DEFAULT false,
	"historical_cast_size" integer,
	"workflow_overrides" text[] DEFAULT '{}' NOT NULL,
	"first_rehearsal_date" text,
	"tech_week_start" text,
	"opening_night" text,
	"closing_night" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"venue_id" integer,
	"session_id" integer,
	"name" text NOT NULL,
	"flat_rate" real,
	"hourly_rate" real,
	"weekend_rate" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"name" text NOT NULL,
	"start_date" text,
	"end_date" text,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seats" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"venue_id" integer,
	"section" text,
	"row_label" text,
	"seat_number" integer,
	"status" text,
	"grid_x" integer,
	"grid_y" integer
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"season_id" integer,
	"name" text NOT NULL,
	"start_date" text,
	"end_date" text,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "show_team" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"person_id" integer,
	"position_id" integer,
	"status" text DEFAULT 'Active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"venue_id" integer,
	"room_name" text NOT NULL,
	"capacity" integer,
	"floor_type" text,
	"square_footage" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_interest" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"person_id" integer,
	"season_id" integer,
	"name" text,
	"availability" jsonb,
	"preferred_position_ids" integer[] DEFAULT '{}' NOT NULL,
	"constraints" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"role_name" text NOT NULL,
	"department" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"name" text NOT NULL,
	"marketing_name" text,
	"chapters" text,
	"seating_capacity" integer,
	"location_notes" text,
	"address" text,
	"seating_chart_url" text,
	"type" text,
	"contact_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"person_id" integer,
	"role_id" integer,
	"audition_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audition_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"time_label" text NOT NULL,
	"date_time" text,
	"capacity" integer DEFAULT 12 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"performer_id" integer,
	"slot_id" integer,
	"vocal_score" real,
	"acting_score" real,
	"stage_presence_score" real,
	"dance_score" real,
	"acting_notes" text,
	"choreography_notes" text,
	"music_notes" text,
	"drop_in_notes" text,
	"admin_notes" text,
	"lobby_note" text,
	"audition_date" text,
	"song" text,
	"monologue" text,
	"vocal_range" text,
	"voice_type" text,
	"audition_video_url" text,
	"dance_video_url" text,
	"backing_track_url" text,
	"checked_in" boolean DEFAULT false,
	"commitment_to_character" boolean DEFAULT false,
	"paid_fees" boolean DEFAULT false,
	"production_fee_status" text,
	"measurements_taken" boolean DEFAULT false,
	"grade" text,
	"hair_color" text,
	"accept_any_role" boolean DEFAULT false,
	"off_book_agreement" boolean DEFAULT false,
	"parent_help_agreement" boolean DEFAULT false,
	"signatures_text" text,
	"program_bio" text,
	"congrats_ad_text" text,
	"cast_party_rsvp" text,
	"script_score_number" text,
	"audition_number" text,
	"status" text DEFAULT 'Pending',
	"callback_status" text,
	"willing_to_alter_appearance" boolean DEFAULT false,
	"fear_of_heights" boolean DEFAULT false,
	"other_talents" text,
	"referral_source" text,
	"preferred_roles" text,
	"stage_romance" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blueprint_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"master_show_id" integer,
	"role_name" text NOT NULL,
	"role_type" text,
	"casting_constraints" text,
	"vocal_range" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"person_id" integer,
	"parent_signer_name" text,
	"signer_email" text,
	"doc_type" text,
	"initials" text,
	"signed_at" text,
	"performer_bio" text,
	"congrats_ad" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_bios" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"person_id" integer,
	"student_first_name" text,
	"student_last_name" text,
	"date_of_birth" text,
	"preferred_name" text,
	"guardian_first_name" text,
	"guardian_last_name" text,
	"guardian_email" text,
	"guardian_phone" text,
	"prior_experience" text,
	"medical_notes" text,
	"processed" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"name" text NOT NULL,
	"url" text,
	"type" text,
	"barcode_sku" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"event_id" integer,
	"person_id" integer,
	"checked_in_by_id" integer,
	"check_in_time" text,
	"check_out_time" text,
	"status" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "committee_prefs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"parent_person_id" integer,
	"student_person_id" integer,
	"pre_show_1" text,
	"pre_show_2" text,
	"pre_show_3" text,
	"show_week_1" text,
	"show_week_2" text,
	"show_week_3" text,
	"chair_interest" text[] DEFAULT '{}' NOT NULL,
	"notes" text,
	"processed" boolean DEFAULT false,
	"assigned_pre_show" text,
	"assigned_show_week" text,
	"is_chair" boolean DEFAULT false,
	"tickets_sold" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "committee_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"submitter_id" integer,
	"name" text,
	"committee_name" text,
	"report_date" text,
	"production_phase" text,
	"progress_update" text,
	"attendance_notes" text,
	"blockers_and_needs" text,
	"estimated_completion" integer,
	"money_spent_this_week" real,
	"receipt_urls" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conflicts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"event_id" integer,
	"person_id" integer,
	"conflict_type" text,
	"minutes_late_early" integer,
	"submitted_via" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"event_date" text,
	"start_time" text,
	"end_time" text,
	"event_type" text,
	"is_required" boolean DEFAULT false,
	"conflict_allowed" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"scene_id" integer,
	"person_id" integer,
	"assignment_id" integer,
	"counts_toward_minimum" boolean DEFAULT true,
	"notes" text,
	"slot_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"scene_name" text NOT NULL,
	"act" text,
	"scene_size" text,
	"minimum_performers" integer,
	"counts_toward_minimum" boolean DEFAULT true,
	"location" text,
	"scene_type" text,
	"sort_order" integer DEFAULT 0,
	"music_status" text,
	"dance_status" text,
	"blocking_status" text,
	"music_load" real,
	"dance_load" real,
	"blocking_load" real,
	"pages" text,
	"blueprint_role_ids" integer[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"production_id" integer,
	"event_id" integer,
	"scene_id" integer,
	"name" text,
	"active" boolean DEFAULT true,
	"track" text,
	"start_time" text,
	"end_time" text,
	"duration" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"session_id" integer,
	"teacher_id" integer,
	"space_id" integer,
	"class_name" text NOT NULL,
	"location" text,
	"day" text,
	"time_slot" text,
	"min_age" integer,
	"max_age" integer,
	"type" text,
	"is_core_curriculum" boolean DEFAULT false,
	"status" text DEFAULT 'Active',
	"description" text,
	"objectives" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garment_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"sku" text NOT NULL,
	"qr_code_value" text,
	"photo_url" text,
	"category" text,
	"bin_location" text,
	"chest" real,
	"waist" real,
	"hips" real,
	"inseam" real,
	"girth" real,
	"neck" real,
	"hat_head" real,
	"shoe_size" real,
	"glove_size" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"baserow_id" integer,
	"person_id" integer,
	"measured_at" text,
	"height" real,
	"chest" real,
	"waist" real,
	"hips" real,
	"inseam" real,
	"girth" real,
	"neck" real,
	"hat_head" real,
	"shoe_size" real,
	"glove_size" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_onboarding_requests" ADD CONSTRAINT "organization_onboarding_requests_created_organization_id_organizations_id_fk" FOREIGN KEY ("created_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_parent_1_id_people_id_fk" FOREIGN KEY ("parent_1_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_parent_2_id_people_id_fk" FOREIGN KEY ("parent_2_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_parent_3_id_people_id_fk" FOREIGN KEY ("parent_3_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_shows" ADD CONSTRAINT "master_shows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_master_show_id_master_shows_id_fk" FOREIGN KEY ("master_show_id") REFERENCES "public"."master_shows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productions" ADD CONSTRAINT "productions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_rates" ADD CONSTRAINT "rental_rates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_rates" ADD CONSTRAINT "rental_rates_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_rates" ADD CONSTRAINT "rental_rates_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_team" ADD CONSTRAINT "show_team_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_team" ADD CONSTRAINT "show_team_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_team" ADD CONSTRAINT "show_team_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_team" ADD CONSTRAINT "show_team_position_id_staff_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."staff_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_interest" ADD CONSTRAINT "staff_interest_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_interest" ADD CONSTRAINT "staff_interest_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_interest" ADD CONSTRAINT "staff_interest_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_positions" ADD CONSTRAINT "staff_positions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_role_id_blueprint_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."blueprint_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_audition_id_auditions_id_fk" FOREIGN KEY ("audition_id") REFERENCES "public"."auditions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audition_slots" ADD CONSTRAINT "audition_slots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audition_slots" ADD CONSTRAINT "audition_slots_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_performer_id_people_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditions" ADD CONSTRAINT "auditions_slot_id_audition_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."audition_slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_roles" ADD CONSTRAINT "blueprint_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_roles" ADD CONSTRAINT "blueprint_roles_master_show_id_master_shows_id_fk" FOREIGN KEY ("master_show_id") REFERENCES "public"."master_shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_bios" ADD CONSTRAINT "student_bios_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_bios" ADD CONSTRAINT "student_bios_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_bios" ADD CONSTRAINT "student_bios_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_checked_in_by_id_people_id_fk" FOREIGN KEY ("checked_in_by_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_prefs" ADD CONSTRAINT "committee_prefs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_prefs" ADD CONSTRAINT "committee_prefs_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_prefs" ADD CONSTRAINT "committee_prefs_parent_person_id_people_id_fk" FOREIGN KEY ("parent_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_prefs" ADD CONSTRAINT "committee_prefs_student_person_id_people_id_fk" FOREIGN KEY ("student_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_reports" ADD CONSTRAINT "committee_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_reports" ADD CONSTRAINT "committee_reports_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_reports" ADD CONSTRAINT "committee_reports_submitter_id_people_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_assignments" ADD CONSTRAINT "scene_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_assignments" ADD CONSTRAINT "scene_assignments_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_assignments" ADD CONSTRAINT "scene_assignments_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_assignments" ADD CONSTRAINT "scene_assignments_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_assignments" ADD CONSTRAINT "scene_assignments_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_production_id_productions_id_fk" FOREIGN KEY ("production_id") REFERENCES "public"."productions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_student_id_people_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_people_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_inventory" ADD CONSTRAINT "garment_inventory_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "families_org_baserow_uidx" ON "families" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "families_org_email_idx" ON "families" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "org_onboarding_slug_idx" ON "organization_onboarding_requests" USING btree ("requested_slug");--> statement-breakpoint
CREATE INDEX "org_onboarding_email_idx" ON "organization_onboarding_requests" USING btree ("contact_email");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uidx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_baserow_registry_uidx" ON "organizations" USING btree ("baserow_registry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "people_org_baserow_uidx" ON "people" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "people_org_email_idx" ON "people" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "people_org_secondary_email_idx" ON "people" USING btree ("organization_id","secondary_email");--> statement-breakpoint
CREATE INDEX "people_org_family_idx" ON "people" USING btree ("organization_id","family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "master_shows_org_baserow_uidx" ON "master_shows" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "master_shows_org_idx" ON "master_shows" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "performances_org_baserow_uidx" ON "performances" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "performances_org_prod_idx" ON "performances" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "productions_org_baserow_uidx" ON "productions" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "productions_org_status_idx" ON "productions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "rental_rates_org_baserow_uidx" ON "rental_rates" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "rental_rates_org_idx" ON "rental_rates" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_org_baserow_uidx" ON "seasons" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "seasons_org_idx" ON "seasons" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seats_org_baserow_uidx" ON "seats" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "seats_org_venue_idx" ON "seats" USING btree ("organization_id","venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_org_baserow_uidx" ON "sessions" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "sessions_org_idx" ON "sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "show_team_org_baserow_uidx" ON "show_team" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "show_team_org_prod_idx" ON "show_team" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE INDEX "show_team_org_person_idx" ON "show_team" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_org_baserow_uidx" ON "spaces" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "spaces_org_venue_idx" ON "spaces" USING btree ("organization_id","venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_interest_org_baserow_uidx" ON "staff_interest" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "staff_interest_org_season_idx" ON "staff_interest" USING btree ("organization_id","season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_positions_org_baserow_uidx" ON "staff_positions" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "staff_positions_org_idx" ON "staff_positions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_org_baserow_uidx" ON "venues" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "venues_org_idx" ON "venues" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_org_baserow_uidx" ON "assignments" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "assignments_org_prod_idx" ON "assignments" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE INDEX "assignments_org_person_idx" ON "assignments" USING btree ("organization_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audition_slots_org_baserow_uidx" ON "audition_slots" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "audition_slots_org_prod_idx" ON "audition_slots" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auditions_org_baserow_uidx" ON "auditions" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "auditions_org_prod_idx" ON "auditions" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE INDEX "auditions_org_performer_idx" ON "auditions" USING btree ("organization_id","performer_id");--> statement-breakpoint
CREATE INDEX "auditions_org_slot_idx" ON "auditions" USING btree ("organization_id","slot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blueprint_roles_org_baserow_uidx" ON "blueprint_roles" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "blueprint_roles_org_show_idx" ON "blueprint_roles" USING btree ("organization_id","master_show_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signatures_org_baserow_uidx" ON "signatures" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "signatures_org_prod_idx" ON "signatures" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_bios_org_baserow_uidx" ON "student_bios" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "student_bios_org_prod_idx" ON "student_bios" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_org_baserow_uidx" ON "assets" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "assets_org_prod_idx" ON "assets" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_org_baserow_uidx" ON "attendance" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "attendance_org_prod_idx" ON "attendance" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "committee_prefs_org_baserow_uidx" ON "committee_prefs" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "committee_prefs_org_prod_idx" ON "committee_prefs" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "committee_reports_org_baserow_uidx" ON "committee_reports" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "committee_reports_org_prod_idx" ON "committee_reports" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conflicts_org_baserow_uidx" ON "conflicts" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "conflicts_org_prod_idx" ON "conflicts" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_org_baserow_uidx" ON "events" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "events_org_prod_idx" ON "events" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scene_assignments_org_baserow_uidx" ON "scene_assignments" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "scene_assignments_org_prod_idx" ON "scene_assignments" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE INDEX "scene_assignments_org_scene_idx" ON "scene_assignments" USING btree ("organization_id","scene_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scenes_org_baserow_uidx" ON "scenes" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "scenes_org_prod_idx" ON "scenes" USING btree ("organization_id","production_id");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_slots_org_baserow_uidx" ON "schedule_slots" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "schedule_slots_org_event_idx" ON "schedule_slots" USING btree ("organization_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_enrollments_org_class_student_uidx" ON "class_enrollments" USING btree ("organization_id","class_id","student_id");--> statement-breakpoint
CREATE INDEX "class_enrollments_org_student_idx" ON "class_enrollments" USING btree ("organization_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_org_baserow_uidx" ON "classes" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "classes_org_session_idx" ON "classes" USING btree ("organization_id","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "garment_inventory_org_baserow_uidx" ON "garment_inventory" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "garment_inventory_org_sku_uidx" ON "garment_inventory" USING btree ("organization_id","sku");--> statement-breakpoint
CREATE INDEX "garment_inventory_org_cat_idx" ON "garment_inventory" USING btree ("organization_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "measurements_org_baserow_uidx" ON "measurements" USING btree ("organization_id","baserow_id");--> statement-breakpoint
CREATE INDEX "measurements_org_person_idx" ON "measurements" USING btree ("organization_id","person_id");