-- New audit actions for the card catalogue and phone changes.
--
-- Separate from 0004 because ALTER TYPE ... ADD VALUE and the statements
-- that USE the new value cannot share a transaction in PostgreSQL.

ALTER TYPE "public"."audit_action" ADD VALUE 'card_product_created';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'phone_changed';
