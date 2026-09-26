-- YES Bank, finally.
--
-- 0011 left YES Bank out because its site refuses automated requests: curl
-- gets an empty JavaScript shell, and headless Chromium gets an outright
-- ERR_HTTP2_PROTOCOL_ERROR. The block turned out to be on the TLS and HTTP/2
-- fingerprint rather than on browsers as such -- driving the real Chrome
-- binary instead of bundled Chromium renders both pages in full.
--
-- What it shows is a range nothing like the seeded one. YES Bank sells 22
-- credit cards and 28 debit cards; this catalogue listed seven and three,
-- and five of the credit names correspond to nothing it sells any more --
-- "YES First Preferred" and "YES First Exclusive" predate a rebrand, and the
-- credit card called "Premia" is now a debit card.
--
-- 47 products added, 36 of them linked. The 11 without a link are real cards
-- named on the page whose tile leads to a generic application form rather
-- than to a page about that card; a link to an apply form is not a link to
-- the card, so they get none.
--
-- "YES Marquee" stays and is NOT re-added as "YES MARQUEE". Matching here is
-- on the slug rather than the name, because those two differ only in case
-- and are one card: comparing names would have split the answer to "who has
-- a Marquee" across two products, and the unique index would have rejected
-- the second row anyway.

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
  ('YES', 'credit', 'YES Marquee', 'yes-marquee', NULL),
  ('YES', 'credit', 'YES EMI Card', 'yes-emi-card', NULL),
  ('YES', 'credit', 'YES RESERV', 'yes-reserv', NULL),
  ('YES', 'credit', 'YES Elite+', 'yes-elite-plus', NULL),
  ('YES', 'credit', 'YES ACE', 'yes-ace', NULL),
  ('YES', 'credit', 'YES Select', 'yes-select', NULL),
  ('YES', 'credit', 'YES RuPay', 'yes-rupay', NULL),
  ('YES', 'credit', 'YES Klick', 'yes-klick', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/klick-credit-card'),
  ('YES', 'credit', 'YES FinBooster', 'yes-finbooster', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/finbooster-card'),
  ('YES', 'credit', 'YES Paisabazaar PaisaSave', 'yes-paisabazaar-paisasave', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/paisabazaar-credit-card'),
  ('YES', 'credit', 'YES Paisabazaar PaisaSave RuPay', 'yes-paisabazaar-paisasave-rupay', NULL),
  ('YES', 'credit', 'YES POP-CLUB', 'yes-pop-club', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/pop-club-credit-card'),
  ('YES', 'credit', 'YES ANQ Phi', 'yes-anq-phi', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/anq-phi-credit-card'),
  ('YES', 'credit', 'YES UNI', 'yes-uni', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/uni-credit-card'),
  ('YES', 'credit', 'YES UNI RuPay', 'yes-uni-rupay', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/uni-rupay-credit-card'),
  ('YES', 'credit', 'YES Zagg', 'yes-zagg', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/zagg-credit-card'),
  ('YES', 'credit', 'YES BYOC', 'yes-byoc', NULL),
  ('YES', 'credit', 'YES Wellness', 'yes-wellness', NULL),
  ('YES', 'credit', 'YES Wellness Plus', 'yes-wellness-plus', NULL),
  ('YES', 'credit', 'YES Essence Women''s', 'yes-essence-women-s', NULL),
  ('YES', 'credit', 'YES novio', 'yes-novio', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/novio-credit-card'),
  ('YES', 'credit', 'YES novio RuPay', 'yes-novio-rupay', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/novio-rupay-credit-card'),
  ('YES', 'debit', 'YES First Debit', 'yes-first-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-first-debit-card'),
  ('YES', 'debit', 'YES Prosperity Sleek Debit', 'yes-prosperity-sleek-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-sleek-debit-card'),
  ('YES', 'debit', 'YES Prosperity Bold Debit', 'yes-prosperity-bold-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-bold-debit-card'),
  ('YES', 'debit', 'YES Prosperity Prime Debit', 'yes-prosperity-prime-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-prime-debit-card'),
  ('YES', 'debit', 'YES Prosperity Sleek Business Debit', 'yes-prosperity-sleek-business-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-sleek-debit-card'),
  ('YES', 'debit', 'YES Prosperity Bold Business Debit', 'yes-prosperity-bold-business-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-bold-business-debit-card'),
  ('YES', 'debit', 'YES Prosperity Prime Business Debit', 'yes-prosperity-prime-business-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-prime-business-debit-card'),
  ('YES', 'debit', 'YES Prosperity RuPay Platinum Debit', 'yes-prosperity-rupay-platinum-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-platinum-debit-card'),
  ('YES', 'debit', 'YES Premia Debit', 'yes-premia-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-premia-debit-card'),
  ('YES', 'debit', 'YES Grandeur Debit', 'yes-grandeur-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-grandeur-debit-card'),
  ('YES', 'debit', 'YES Grandeur Business Debit', 'yes-grandeur-business-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/grandeur-business-debit-card'),
  ('YES', 'debit', 'YES First Business Debit', 'yes-first-business-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-first-business-debit-card'),
  ('YES', 'debit', 'YES Venture Debit', 'yes-venture-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/venture-debit-card'),
  ('YES', 'debit', 'YES Venture Business Debit', 'yes-venture-business-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/venture-debit-card'),
  ('YES', 'debit', 'YES Spirit Debit', 'yes-spirit-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/spirit-debit-card'),
  ('YES', 'debit', 'YES Aura Debit', 'yes-aura-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/aura-debit-card'),
  ('YES', 'debit', 'YES Apex Debit', 'yes-apex-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/apex-debit-card'),
  ('YES', 'debit', 'YES Apex Metal Debit', 'yes-apex-metal-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/apex-debit-card'),
  ('YES', 'debit', 'YES Reflection Image Debit', 'yes-reflection-image-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/reflection-debit-card'),
  ('YES', 'debit', 'YES PMJDY RuPay Chip Debit', 'yes-pmjdy-rupay-chip-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-bank-pmjdy-rupay-chip-debit-card'),
  ('YES', 'debit', 'YES RuPay Kisan Debit', 'yes-rupay-kisan-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-bank-rupay-kisan-debit-card'),
  ('YES', 'debit', 'YES Elegance Debit', 'yes-elegance-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/elegance-debit-card'),
  ('YES', 'debit', 'YES Healthfit Debit', 'yes-healthfit-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/healthfit-debit-card'),
  ('YES', 'debit', 'YES Emerge Debit', 'yes-emerge-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/emerge-debit-card'),
  ('YES', 'debit', 'YES Explore Debit', 'yes-explore-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/explore-debit-card'),
  ('YES', 'debit', 'YES Engage Debit', 'yes-engage-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/engage-debit-card'),
  ('YES', 'debit', 'YES Element Debit', 'yes-element-debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/element-debit-card'),
  ('YES', 'debit', 'YES Private Debit', 'yes-private-debit', NULL)
) AS v(code, card_type, name, slug, url)
JOIN "banks" b ON b."code" = v.code
ON CONFLICT ("bank_id", "card_type", "slug") DO UPDATE
  SET "product_url" = EXCLUDED."product_url"
  WHERE EXCLUDED."product_url" IS NOT NULL;--> statement-breakpoint

-- Dropped only where nobody selected one. A product a real member picked
-- stays, vague name and all, rather than breaking their card.
DELETE FROM "card_products" p
USING "banks" b, (VALUES
  ('YES', 'credit', 'yes-prosperity-rewards-plus'),
  ('YES', 'credit', 'yes-premia'),
  ('YES', 'credit', 'yes-first-preferred'),
  ('YES', 'credit', 'yes-first-exclusive'),
  ('YES', 'credit', 'paisabazaar-paisasave-yes'),
  ('YES', 'debit', 'yes-prosperity-debit'),
  ('YES', 'debit', 'yes-platinum-debit')
) AS v(code, card_type, slug)
WHERE b."code" = v.code
  AND p."bank_id" = b."id"
  AND p."card_type" = v.card_type::"card_type"
  AND p."slug" = v.slug
  AND NOT EXISTS (SELECT 1 FROM "cards" c WHERE c."product_id" = p."id");
