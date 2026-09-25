-- The merges that needed a human to choose.
--
-- Each of these had two or more real candidates, so 0007 deliberately left
-- them alone: "Tata Neu" is either the Plus or the Infinity, "BPCL" is
-- either the SBI Card or the Octane, and so on. Picking wrong would have
-- relabelled a real card with a name that looks authoritative, which is
-- worse than leaving it untidy.
--
-- The card owners confirmed each target. After this batch no unverified
-- product remains.
--
-- Cards are REPOINTED, never deleted, exactly as in 0007.

-- 1. Move every card from the source product to the target.
UPDATE "cards" c
SET "product_id" = target."id"
FROM (VALUES
  ('HDFC', 'credit', 'tata-neu', 'tata-neu-plus-hdfc'),
  ('SBI', 'credit', 'bpcl', 'bpcl-sbi-card'),
  ('CSB', 'credit', 'yash-jupiter-csb', 'edge-plus-csb-bank-rupay-credit-card'),
  ('CANARA', 'debit', 'yash-canara-dc', 'canara-rupay-debit'),
  ('HDFC', 'debit', 'yash-hdfc-debit', 'hdfc-millennia-debit')
) AS v(code, card_type, from_slug, to_slug)
JOIN "banks" b ON b."code" = v.code
JOIN "card_products" src
  ON src."bank_id" = b."id"
 AND src."card_type" = v.card_type::"card_type"
 AND src."slug" = v.from_slug
JOIN "card_products" target
  ON target."bank_id" = b."id"
 AND target."card_type" = v.card_type::"card_type"
 AND target."slug" = v.to_slug
WHERE c."product_id" = src."id";--> statement-breakpoint

-- 2. Remove the now-unreferenced source products.
--    NOT EXISTS is belt and braces: step 1 should have emptied them, and if
--    it somehow did not, the product stays rather than orphaning a card.
DELETE FROM "card_products" p
USING (VALUES
  ('HDFC', 'credit', 'tata-neu', 'tata-neu-plus-hdfc'),
  ('SBI', 'credit', 'bpcl', 'bpcl-sbi-card'),
  ('CSB', 'credit', 'yash-jupiter-csb', 'edge-plus-csb-bank-rupay-credit-card'),
  ('CANARA', 'debit', 'yash-canara-dc', 'canara-rupay-debit'),
  ('HDFC', 'debit', 'yash-hdfc-debit', 'hdfc-millennia-debit')
) AS v(code, card_type, from_slug, to_slug)
JOIN "banks" b ON b."code" = v.code
WHERE p."bank_id" = b."id"
  AND p."card_type" = v.card_type::"card_type"
  AND p."slug" = v.from_slug
  AND NOT p."is_verified"
  AND NOT EXISTS (SELECT 1 FROM "cards" c WHERE c."product_id" = p."id");
