-- Corrections found by reading all 365 linked pages back.
--
-- Every shipped link was loaded in a real browser and checked against the
-- page's own heading and text. Nothing was dead and nothing pointed at the
-- wrong bank, but two entries were wrong in a way only the page could show.
--
-- 1. "YES Prosperity RuPay Platinum Debit" is not a RuPay card. Its page is
--    titled "YES Prosperity Platinum Debit card" and the word RuPay appears
--    nowhere on it. Renamed IN PLACE, so the product keeps its id and any
--    card pointing at it is untouched.
--
-- 2. "AU Visa Platinum Debit" and "AU Platinum Debit" are the same card. AU
--    lists both /visa-platinum-debit-card and /platinum-debit-card, and the
--    two serve byte-identical pages -- same title, same headings, same 6768
--    characters. Two names for one card split the answer to "who has this
--    card", so the duplicate goes.
--
-- The duplicate is dropped only if nobody selected it, as in every batch
-- since 0006.

UPDATE "card_products" p
SET "name" = 'YES Prosperity Platinum Debit',
    "slug" = 'yes-prosperity-platinum-debit',
    "updated_at" = now()
FROM "banks" b
WHERE b."code" = 'YES'
  AND p."bank_id" = b."id"
  AND p."card_type" = 'debit'
  AND p."slug" = 'yes-prosperity-rupay-platinum-debit';--> statement-breakpoint

DELETE FROM "card_products" p
USING "banks" b
WHERE b."code" = 'AUSFB'
  AND p."bank_id" = b."id"
  AND p."card_type" = 'debit'
  AND p."slug" = 'au-visa-platinum-debit'
  AND NOT EXISTS (SELECT 1 FROM "cards" c WHERE c."product_id" = p."id");
