-- Canara's real card range, taken from Canara.
--
-- The seed list had four Canara credit cards and three debit ones, with
-- names like "Canara Platinum Debit" that were never a card anybody holds.
-- Canara publishes 16 credit cards and 15 debit cards, each on its own page:
-- what this catalogue called "Canara Platinum Debit" is five separate real
-- products (Visa Platinum, Mastercard Platinum, Mastercard Platinum Women,
-- RuPay Platinum Domestic, RuPay Platinum International).
--
-- A vague name fails twice over. It cannot answer "who among my friends has
-- THIS card", because five different cards answer to it. And it cannot be
-- linked to the issuer's page, because there are five pages.
--
-- Every name and URL below came from canarabank.bank.in's own credit-card
-- and debit-card lists; each page was then opened and its <h1> read back.
-- One listing label was wrong -- the millennial card carried the women's
-- card's heading -- and the page itself is what caught it.
--
-- The four existing credit entries already named real cards, so they are
-- left alone and simply gain a URL in 0009's column.
--
-- "Canara RuPay Debit" is NOT dropped: a member's card points at it, and
-- only its owner knows which of the five RuPay variants they hold. It stays
-- until they re-pick. The other two vague debit names go, but only where
-- nobody selected them.

-- Added, never replaced: a product that is already there keeps its id, so
-- every card pointing at it is untouched.
--
-- The URL, unlike a member-supplied one, IS overwritten. 0009's rule that a
-- link may be added but never changed protects members from each other; this
-- batch is the issuer's own list correcting a URL that an earlier batch of
-- this same catalogue guessed at. It never writes NULL over a URL that is
-- already there.
INSERT INTO "card_products" ("bank_id", "card_type", "name", "slug", "product_url", "is_verified")
SELECT b."id", v.card_type::"card_type", v.name, v.slug, v.url, true
FROM (VALUES
  ('CANARA', 'credit', 'Canara RuPay Select', 'canara-rupay-select', 'https://www.canarabank.bank.in/rupay-select-credit-card'),
  ('CANARA', 'credit', 'Canara Visa Platinum', 'canara-visa-platinum', 'https://www.canarabank.bank.in/visa-platinum-credit-card'),
  ('CANARA', 'credit', 'Canara Mastercard Platinum', 'canara-mastercard-platinum', 'https://www.canarabank.bank.in/mastercard-platinum-credit-card'),
  ('CANARA', 'credit', 'Canara RuPay Platinum', 'canara-rupay-platinum', 'https://www.canarabank.bank.in/rupay-platinum-credit-card'),
  ('CANARA', 'credit', 'Canara Visa Signature', 'canara-visa-signature', 'https://www.canarabank.bank.in/visa-signature-credit-card'),
  ('CANARA', 'credit', 'Canara Mastercard World', 'canara-mastercard-world', 'https://www.canarabank.bank.in/mastercard-world-credit-card'),
  ('CANARA', 'credit', 'Canara RuPay Select Secured', 'canara-rupay-select-secured', 'https://www.canarabank.bank.in/rupay-select-secured-credit-card'),
  ('CANARA', 'credit', 'Canara Visa Corporate', 'canara-visa-corporate', 'https://www.canarabank.bank.in/visa-corporate-credit-card'),
  ('CANARA', 'credit', 'Canara Mastercard Gold', 'canara-mastercard-gold', 'https://www.canarabank.bank.in/mastercard-gold-credit-card'),
  ('CANARA', 'credit', 'Canara Visa Gold', 'canara-visa-gold', 'https://www.canarabank.bank.in/visa-gold-credit-card'),
  ('CANARA', 'credit', 'Canara RuPay Platinum Secured', 'canara-rupay-platinum-secured', 'https://www.canarabank.bank.in/rupay-platinum-secured-credit-card'),
  ('CANARA', 'credit', 'Canara Mastercard Gold Secured', 'canara-mastercard-gold-secured', 'https://www.canarabank.bank.in/mastercard-gold-secured-credit-card'),
  ('CANARA', 'credit', 'Canara Visa Gold Secured', 'canara-visa-gold-secured', 'https://www.canarabank.bank.in/visa-gold-secured-credit-card'),
  ('CANARA', 'credit', 'Canara RuPay Classic', 'canara-rupay-classic', 'https://www.canarabank.bank.in/rupay-classic-credit-card'),
  ('CANARA', 'credit', 'Canara Mastercard Standard', 'canara-mastercard-standard', 'https://www.canarabank.bank.in/mastercard-standard-credit-card'),
  ('CANARA', 'credit', 'Canara Visa Classic', 'canara-visa-classic', 'https://www.canarabank.bank.in/visa-classic-credit-card'),
  ('CANARA', 'debit', 'Canara RuPay Select Debit', 'canara-rupay-select-debit', 'https://www.canarabank.bank.in/rupay-select-debit-card'),
  ('CANARA', 'debit', 'Canara Mastercard World Debit', 'canara-mastercard-world-debit', 'https://www.canarabank.bank.in/mastercard-world-debit-card'),
  ('CANARA', 'debit', 'Canara Visa Platinum Debit', 'canara-visa-platinum-debit', 'https://www.canarabank.bank.in/visa-platinum-debit-card'),
  ('CANARA', 'debit', 'Canara RuPay Platinum International Debit', 'canara-rupay-platinum-international-debit', 'https://www.canarabank.bank.in/rupay-platinum-international-debit-card'),
  ('CANARA', 'debit', 'Canara Mastercard World NRI Platina Debit', 'canara-mastercard-world-nri-platina-debit', 'https://www.canarabank.bank.in/mastercard-world-nri-platina-debit-card'),
  ('CANARA', 'debit', 'Canara Visa Classic Debit', 'canara-visa-classic-debit', 'https://www.canarabank.bank.in/visa-classic-debit-card'),
  ('CANARA', 'debit', 'Canara RuPay Platinum Domestic Debit', 'canara-rupay-platinum-domestic-debit', 'https://www.canarabank.bank.in/rupay-platinum-domestic-debit-card'),
  ('CANARA', 'debit', 'Canara Mastercard Platinum Women Debit', 'canara-mastercard-platinum-women-debit', 'https://www.canarabank.bank.in/mastercard-platinum-women-debit-card'),
  ('CANARA', 'debit', 'Canara Mastercard Platinum Millennial Debit', 'canara-mastercard-platinum-millennial-debit', 'https://www.canarabank.bank.in/mastercard-platinum-millennial-debit-card'),
  ('CANARA', 'debit', 'Canara RuPay Classic Debit', 'canara-rupay-classic-debit', 'https://www.canarabank.bank.in/rupay-classic-debit-card'),
  ('CANARA', 'debit', 'Canara Mastercard Platinum Debit', 'canara-mastercard-platinum-debit', 'https://www.canarabank.bank.in/mastercard-platinum-debit-card'),
  ('CANARA', 'debit', 'Canara Mastercard Business Debit', 'canara-mastercard-business-debit', 'https://www.canarabank.bank.in/mastercard-business-debit-card'),
  ('CANARA', 'debit', 'Canara Mastercard Standard Debit', 'canara-mastercard-standard-debit', 'https://www.canarabank.bank.in/mastercard-standard-debit-card'),
  ('CANARA', 'debit', 'Canara RuPay Millennial Debit', 'canara-rupay-millennial-debit', 'https://www.canarabank.bank.in/rupay-millennial-debit-card'),
  ('CANARA', 'debit', 'Canara RuPay Women Platinum Debit', 'canara-rupay-women-platinum-debit', 'https://www.canarabank.bank.in/rupay-women-platinum-debit-card'),
  ('CANARA', 'debit', 'Canara RuPay Debit', 'canara-rupay-debit', NULL)
) AS v(code, card_type, name, slug, url)
JOIN "banks" b ON b."code" = v.code
ON CONFLICT ("bank_id", "card_type", "slug") DO UPDATE
  SET "product_url" = EXCLUDED."product_url"
  WHERE EXCLUDED."product_url" IS NOT NULL;--> statement-breakpoint

-- Dropped only where nobody selected one. A product a real member picked
-- stays, vague name and all, rather than breaking their card.
DELETE FROM "card_products" p
USING "banks" b, (VALUES
  ('CANARA', 'debit', 'canara-classic-debit'),
  ('CANARA', 'debit', 'canara-platinum-debit')
) AS v(code, card_type, slug)
WHERE b."code" = v.code
  AND p."bank_id" = b."id"
  AND p."card_type" = v.card_type::"card_type"
  AND p."slug" = v.slug
  AND NOT EXISTS (SELECT 1 FROM "cards" c WHERE c."product_id" = p."id");
