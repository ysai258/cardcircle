CREATE TYPE "public"."audit_action" AS ENUM('user_registered', 'user_logged_in', 'user_login_failed', 'user_logged_out', 'card_created', 'card_updated', 'card_deleted', 'card_viewed', 'card_sharing_updated', 'friend_request_sent', 'friend_request_accepted', 'friend_request_rejected', 'friend_removed', 'user_blocked', 'user_unblocked', 'user_reported', 'user_searched', 'phone_revealed');--> statement-breakpoint
CREATE TYPE "public"."card_field" AS ENUM('expiry');--> statement-breakpoint
CREATE TYPE "public"."card_network" AS ENUM('visa', 'mastercard', 'rupay', 'amex');--> statement-breakpoint
CREATE TYPE "public"."card_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."discoverability" AS ENUM('nobody', 'friends', 'everyone');--> statement-breakpoint
CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'reviewed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('nobody', 'friends');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"target_user_id" uuid,
	"action" "audit_action" NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_sharing_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"field_name" "card_field" NOT NULL,
	"visibility" "visibility" DEFAULT 'nobody' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"bank_id" uuid NOT NULL,
	"nickname" text NOT NULL,
	"variant" text,
	"card_type" "card_type" NOT NULL,
	"network" "card_network" NOT NULL,
	"bin" text NOT NULL,
	"last4" text NOT NULL,
	"expiry_ct" "bytea",
	"discoverability" "discoverability" DEFAULT 'everyone' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cards_bin_digits" CHECK ("cards"."bin" ~ '^[0-9]{6}$'),
	CONSTRAINT "cards_last4_digits" CHECK ("cards"."last4" ~ '^[0-9]{4}$')
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reported_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_sha256" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone_hmac" "bytea" NOT NULL,
	"phone_ct" "bytea" NOT NULL,
	"phone_country_code" text NOT NULL,
	"phone_last4" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"phone_visibility" "visibility" DEFAULT 'nobody' NOT NULL,
	"avatar_url" text,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_last4_digits" CHECK ("users"."phone_last4" ~ '^[0-9]{4}$'),
	CONSTRAINT "users_phone_cc_digits" CHECK ("users"."phone_country_code" ~ '^[0-9]{1,4}$')
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_sharing_settings" ADD CONSTRAINT "card_sharing_settings_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_created_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "banks_code_unique" ON "banks" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_pair_unique" ON "blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "card_sharing_card_field_unique" ON "card_sharing_settings" USING btree ("card_id","field_name");--> statement-breakpoint
CREATE INDEX "cards_owner_idx" ON "cards" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "cards_bank_type_network_idx" ON "cards" USING btree ("bank_id","card_type","network");--> statement-breakpoint
CREATE INDEX "cards_discoverability_idx" ON "cards" USING btree ("discoverability");--> statement-breakpoint
CREATE INDEX "cards_bank_bin_idx" ON "cards" USING btree ("bank_id","bin" text_pattern_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_pair_unique" ON "friendships" USING btree (least("requester_id", "recipient_id"),greatest("requester_id", "recipient_id"));--> statement-breakpoint
CREATE INDEX "friendships_recipient_status_idx" ON "friendships" USING btree ("recipient_id","status");--> statement-breakpoint
CREATE INDEX "friendships_requester_status_idx" ON "friendships" USING btree ("requester_id","status");--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "reports_reported_idx" ON "reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions" USING btree ("token_sha256");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_hmac_unique" ON "users" USING btree ("phone_hmac");