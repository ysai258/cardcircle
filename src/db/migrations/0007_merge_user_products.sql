-- Merge user-created products into their real catalogue entries.
--
-- Cards added before the catalogue existed kept their old nicknames as
-- unverified products, and the "Other" option produced more. Each of the
-- names below refers to a card that IS in the catalogue, so a friend
-- searching the real name would not match them -- which defeats the point
-- of having a catalogue.
--
-- Only unambiguous mappings are here. "Tata Neu" could be Plus or Infinity,
-- and "BPCL" could be the SBI Card or the Octane: two genuinely different
-- cards each. Those stay unverified until a human says which one.
--
-- Cards are REPOINTED, never deleted. The card survives; only the name it
-- refers to is corrected.

-- 1. Move every card from the source product to the target.
UPDATE "cards" c
SET "product_id" = target."id"
FROM (VALUES
  ('AXIS', 'credit', 'flipkart-axis', 'flipkart-axis-bank'),
  ('AXIS', 'credit', 'yash-airtel-axis', 'airtel-axis-bank'),
  ('HDFC', 'credit', 'freedom', 'hdfc-freedom'),
  ('HDFC', 'credit', 'indian-oil-card', 'indianoil-hdfc'),
  ('HDFC', 'debit', 'millenia', 'hdfc-millennia-debit'),
  ('HDFC', 'debit', 'millennia', 'hdfc-millennia-debit'),
  ('IDFC', 'credit', 'yash-idfc-first-wow', 'idfc-first-wow'),
  ('SBI', 'debit', 'yash-sbi-iocl', 'sbi-iocl-co-branded-contactless-rupay-debit-card')
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
  ('AXIS', 'credit', 'flipkart-axis', 'flipkart-axis-bank'),
  ('AXIS', 'credit', 'yash-airtel-axis', 'airtel-axis-bank'),
  ('HDFC', 'credit', 'freedom', 'hdfc-freedom'),
  ('HDFC', 'credit', 'indian-oil-card', 'indianoil-hdfc'),
  ('HDFC', 'debit', 'millenia', 'hdfc-millennia-debit'),
  ('HDFC', 'debit', 'millennia', 'hdfc-millennia-debit'),
  ('IDFC', 'credit', 'yash-idfc-first-wow', 'idfc-first-wow'),
  ('SBI', 'debit', 'yash-sbi-iocl', 'sbi-iocl-co-branded-contactless-rupay-debit-card')
) AS v(code, card_type, from_slug, to_slug)
JOIN "banks" b ON b."code" = v.code
WHERE p."bank_id" = b."id"
  AND p."card_type" = v.card_type::"card_type"
  AND p."slug" = v.from_slug
  AND NOT p."is_verified"
  AND NOT EXISTS (SELECT 1 FROM "cards" c WHERE c."product_id" = p."id");
