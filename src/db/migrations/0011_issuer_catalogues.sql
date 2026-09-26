-- Six more banks, taken from the banks.
--
-- Same problem as Canara in 0010, at six times the size. The seed list
-- described Union Bank's range as "Platinum", "Classic" and "Signature";
-- Union Bank publishes thirteen credit cards and eight debit cards, each on
-- its own page. Bandhan's four seeded credit cards -- Standard, Select,
-- Premium, One -- correspond to nothing Bandhan sells: its cards are Flare,
-- Ignite, Lumina and Sparks.
--
-- Every name and URL below came from the bank's own card listing. 84 pages
-- were fetched and all 84 answered; where a page renders a heading, that
-- heading was read back and is what the name says. PNB's per-card pages name
-- their card in a <div class="leftbluelink title"> rather than a heading, so
-- all 22 were diffed against each other to confirm the pages really differ
-- by card before any of them was linked.
--
-- WHAT IS NOT HERE
--
-- Central Bank's five debit cards are added by name but carry no link: the
-- bank lists them as text on one page and publishes no page per card. Its
-- credit cards are absent entirely -- its credit-card page has no card list
-- at all and links to sbicard.com, so the three seeded names could not be
-- checked either way and are left untouched rather than guessed at.
--
-- YES Bank is missing for a duller reason: its site refuses automated
-- requests, so none of its range could be read. Its seeded names stand.
--
-- PNB's debit cards and HSBC's have no per-card pages either, so those
-- seeded names also stand.
--
-- Names that named nothing real are dropped, but only where no member had
-- selected one -- the same rule as 0006 and 0010.

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
  ('BOB', 'credit', 'BOB Eterna', 'bob-eterna', 'https://www.bobcard.co.in/credit-card-types/eterna'),
  ('BOB', 'credit', 'BOB Premier', 'bob-premier', 'https://www.bobcard.co.in/credit-card-types/premier'),
  ('BOB', 'credit', 'BOB Select', 'bob-select', 'https://www.bobcard.co.in/credit-card-types/select'),
  ('BOB', 'credit', 'BOB Easy', 'bob-easy', 'https://www.bobcard.co.in/credit-card-types/easy'),
  ('BOB', 'credit', 'BOB Snapdeal', 'bob-snapdeal', 'https://www.bobcard.co.in/credit-card-types/snapdeal-bobcard'),
  ('BOB', 'credit', 'IRCTC BOB', 'irctc-bob', 'https://www.bobcard.co.in/credit-card-types/irctc-credit-card'),
  ('BOB', 'credit', 'BOB Varunah', 'bob-varunah', 'https://www.bobcard.co.in/credit-card-types/indian-navy-varunah'),
  ('BOB', 'debit', 'BOB RuPay Select Debit', 'bob-rupay-select-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/rupay-select-debit-card'),
  ('BOB', 'debit', 'BOB World Visa Opulence Debit', 'bob-world-visa-opulence-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bob-world-visa-opulence-debit-card'),
  ('BOB', 'debit', 'BOB World Visa Sapphire Debit', 'bob-world-visa-sapphire-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bob-world-visa-sapphire-debit-card'),
  ('BOB', 'debit', 'BOB Mastercard World Debit', 'bob-mastercard-world-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/mastercard-world-debit-card'),
  ('BOB', 'debit', 'BOB EaseMyTrip Debit', 'bob-easemytrip-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bank-of-baroda-emt-debit-card'),
  ('BOB', 'debit', 'BOB inSIGHT Braille Debit', 'bob-insight-braille-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bob-insight-braille-debit-card'),
  ('BOB', 'debit', 'BOB Visa Platinum Debit', 'bob-visa-platinum-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/visa-platinum-debit-card'),
  ('BOB', 'debit', 'BOB Mastercard Platinum Debit', 'bob-mastercard-platinum-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/baroda-master-platinum-di-debit-card'),
  ('BOB', 'debit', 'BOB RuPay Platinum Debit', 'bob-rupay-platinum-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/rupay-platinum-di-debit-card'),
  ('BOB', 'debit', 'BOB Visa Vyapaar Business Debit', 'bob-visa-vyapaar-business-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/baroda-visa-vyapaar-business-debit-card'),
  ('BOB', 'debit', 'BOB World Yoddha Debit', 'bob-world-yoddha-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bob-world-yoddha-debit-card'),
  ('BOB', 'debit', 'BOB World Agniveer Debit', 'bob-world-agniveer-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bob-world-agniveer-debit-card'),
  ('BOB', 'debit', 'BOB Visa Classic Debit', 'bob-visa-classic-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/visa-classic-di-debit-card'),
  ('BOB', 'debit', 'BOB Mastercard Classic Debit', 'bob-mastercard-classic-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/mastercard-classic-debit-card'),
  ('BOB', 'debit', 'BOB RuPay Classic Debit', 'bob-rupay-classic-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/rupay-classic-debit-card'),
  ('BOB', 'debit', 'BOB RuPay Qsparc NCMC Debit', 'bob-rupay-qsparc-ncmc-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/rupay-national-common-mobility-card-ncmc'),
  ('BOB', 'debit', 'BOB Virtual Debit', 'bob-virtual-debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/virtual-debit-card'),
  ('PNB', 'credit', 'PNB RuPay Select', 'pnb-rupay-select', 'https://creditcard.pnb.bank.in/types6.html'),
  ('PNB', 'credit', 'PNB RuPay Platinum', 'pnb-rupay-platinum', 'https://creditcard.pnb.bank.in/types5.html'),
  ('PNB', 'credit', 'PNB Patanjali RuPay Platinum', 'pnb-patanjali-rupay-platinum', 'https://creditcard.pnb.bank.in/types12.html'),
  ('PNB', 'credit', 'PNB Visa Gold', 'pnb-visa-gold', 'https://creditcard.pnb.bank.in/types1.html'),
  ('PNB', 'credit', 'PNB Visa Classic', 'pnb-visa-classic', 'https://creditcard.pnb.bank.in/types2.html'),
  ('PNB', 'credit', 'PNB Visa Platinum', 'pnb-visa-platinum', 'https://creditcard.pnb.bank.in/types3.html'),
  ('PNB', 'credit', 'PNB Wave & Pay', 'pnb-wave-and-pay', 'https://creditcard.pnb.bank.in/types4.html'),
  ('PNB', 'credit', 'PNB Rakshak RuPay Platinum', 'pnb-rakshak-rupay-platinum', 'https://creditcard.pnb.bank.in/types7.html'),
  ('PNB', 'credit', 'PNB Rakshak RuPay Select', 'pnb-rakshak-rupay-select', 'https://creditcard.pnb.bank.in/types8.html'),
  ('PNB', 'credit', 'PNB Visa Signature', 'pnb-visa-signature', 'https://creditcard.pnb.bank.in/types9.html'),
  ('PNB', 'credit', 'PNB RuPay Millennial', 'pnb-rupay-millennial', 'https://creditcard.pnb.bank.in/types10.html'),
  ('PNB', 'credit', 'PNB Patanjali RuPay Select', 'pnb-patanjali-rupay-select', 'https://creditcard.pnb.bank.in/types11.html'),
  ('PNB', 'credit', 'PNB BLISS', 'pnb-bliss', 'https://creditcard.pnb.bank.in/types13.html'),
  ('PNB', 'credit', 'PNB SALARY RuPay Platinum', 'pnb-salary-rupay-platinum', 'https://creditcard.pnb.bank.in/types14.html'),
  ('PNB', 'credit', 'PNB SALARY RuPay Select', 'pnb-salary-rupay-select', 'https://creditcard.pnb.bank.in/types15.html'),
  ('PNB', 'credit', 'PNB Metal LUXURA on RuPay', 'pnb-metal-luxura-on-rupay', 'https://creditcard.pnb.bank.in/types16.html'),
  ('PNB', 'credit', 'PNB Metal LUXURA on Visa', 'pnb-metal-luxura-on-visa', 'https://creditcard.pnb.bank.in/types17.html'),
  ('PNB', 'credit', 'PNB KIWI Co-Branded', 'pnb-kiwi-co-branded', 'https://creditcard.pnb.bank.in/types18.html'),
  ('PNB', 'credit', 'PNB Zaggle Co-Branded Twin', 'pnb-zaggle-co-branded-twin', 'https://creditcard.pnb.bank.in/types19.html'),
  ('PNB', 'credit', 'PNB Prakram', 'pnb-prakram', 'https://creditcard.pnb.bank.in/types20.html'),
  ('PNB', 'credit', 'PNB Premium Metal LUXURA (Indian Army)', 'pnb-premium-metal-luxura-indian-army', 'https://creditcard.pnb.bank.in/types21.html'),
  ('PNB', 'credit', 'PNB RRB Co-Branded RuPay Select', 'pnb-rrb-co-branded-rupay-select', 'https://creditcard.pnb.bank.in/types24.html'),
  ('PNB', 'debit', 'PNB Platinum Debit', 'pnb-platinum-debit', 'https://pnb.bank.in/Platinum-Debit-Card.html'),
  ('PNB', 'debit', 'PNB Classic Debit', 'pnb-classic-debit', NULL),
  ('PNB', 'debit', 'PNB RuPay Debit', 'pnb-rupay-debit', NULL),
  ('UNION', 'credit', 'Union Bank RuPay Select', 'union-bank-rupay-select', 'https://www.unionbankofindia.bank.in/en/details/rupay-select-credit-card'),
  ('UNION', 'credit', 'Union Bank NEXTERIA', 'union-bank-nexteria', 'https://www.unionbankofindia.bank.in/en/Details/nexteria-credit-card'),
  ('UNION', 'credit', 'Union Bank Unicorn RuPay', 'union-bank-unicorn-rupay', 'https://www.unionbankofindia.bank.in/en/Details/union-unicorn-credit-card'),
  ('UNION', 'credit', 'Union Bank DIVAA ICON', 'union-bank-divaa-icon', 'https://www.unionbankofindia.bank.in/en/Details/divaa-icon-credit-card'),
  ('UNION', 'credit', 'Union Bank PM SVANidhi', 'union-bank-pm-svanidhi', 'https://www.unionbankofindia.bank.in/en/Details/pm-svanidhi-credit-card'),
  ('UNION', 'credit', 'Union Bank JCB Wellness', 'union-bank-jcb-wellness', 'https://www.unionbankofindia.bank.in/en/Details/union-jcb-wellness-credit-card'),
  ('UNION', 'credit', 'Union Bank JCB Health', 'union-bank-jcb-health', 'https://www.unionbankofindia.bank.in/en/Details/union-jcb-health-credit-card'),
  ('UNION', 'credit', 'Union Bank UNI-CARBON', 'union-bank-uni-carbon', 'https://www.unionbankofindia.bank.in/en/Details/union-uni-carbon-credit-card'),
  ('UNION', 'credit', 'Union Bank Sparsh', 'union-bank-sparsh', 'https://www.unionbankofindia.bank.in/en/Details/union-sparsh-credit-card'),
  ('UNION', 'credit', 'Union Bank RuPay Platinum', 'union-bank-rupay-platinum', 'https://www.unionbankofindia.bank.in/en/Details/rupay-platinum-credit-card'),
  ('UNION', 'credit', 'Union Bank Visa Signature', 'union-bank-visa-signature', 'https://www.unionbankofindia.bank.in/en/Details/visa-signature-credit-card'),
  ('UNION', 'credit', 'Union Bank Visa Platinum', 'union-bank-visa-platinum', 'https://www.unionbankofindia.bank.in/en/Details/visa-platinum-credit-card'),
  ('UNION', 'credit', 'Union Bank Visa Gold', 'union-bank-visa-gold', 'https://www.unionbankofindia.bank.in/en/Details/visa-gold-credit-card'),
  ('UNION', 'debit', 'Union Bank HNI Emperio Metal Debit', 'union-bank-hni-emperio-metal-debit', 'https://www.unionbankofindia.bank.in/en/Details/hni-emperio-metal-debit-card'),
  ('UNION', 'debit', 'Union Bank RuPay Empower Her Debit', 'union-bank-rupay-empower-her-debit', 'https://www.unionbankofindia.bank.in/en/Details/rupay-empower-her-debit-card'),
  ('UNION', 'debit', 'Union Bank Qsparc RuPay Debit', 'union-bank-qsparc-rupay-debit', 'https://www.unionbankofindia.bank.in/en/Details/qsparc-debit-card-rupay'),
  ('UNION', 'debit', 'Union Bank Business Platinum Debit', 'union-bank-business-platinum-debit', 'https://www.unionbankofindia.bank.in/en/Details/business-platinum-debit-card'),
  ('UNION', 'debit', 'Union Bank Business Debit (Platinum)', 'union-bank-business-debit-platinum', 'https://www.unionbankofindia.bank.in/en/Details/business-debit-card-platinum'),
  ('UNION', 'debit', 'Union Bank Classic Debit (RuPay / Visa)', 'union-bank-classic-debit-rupay-visa', 'https://www.unionbankofindia.bank.in/en/Details/classic-debit-card-rupay-visa'),
  ('UNION', 'debit', 'Union Bank Platinum Debit (RuPay / Visa / Mastercard)', 'union-bank-platinum-debit-rupay-visa-mastercard', 'https://www.unionbankofindia.bank.in/en/Details/platinum-debit-card-rupay-visa-master'),
  ('UNION', 'debit', 'Union Bank RuPay Select Debit', 'union-bank-rupay-select-debit', 'https://www.unionbankofindia.bank.in/en/Details/rupay-select-debit-card'),
  ('CENTRAL', 'credit', 'Central Bank RuPay Platinum', 'central-bank-rupay-platinum', NULL),
  ('CENTRAL', 'credit', 'Central Bank Aspire', 'central-bank-aspire', NULL),
  ('CENTRAL', 'credit', 'Central Bank Classic', 'central-bank-classic', NULL),
  ('CENTRAL', 'debit', 'Central Bank RuPay Select Wellness Debit', 'central-bank-rupay-select-wellness-debit', NULL),
  ('CENTRAL', 'debit', 'Central Bank RuPay Platinum Debit', 'central-bank-rupay-platinum-debit', NULL),
  ('CENTRAL', 'debit', 'Central Bank RuPay Classic Debit', 'central-bank-rupay-classic-debit', NULL),
  ('CENTRAL', 'debit', 'Central Bank Business Debit', 'central-bank-business-debit', NULL),
  ('CENTRAL', 'debit', 'Central Bank Visa Platinum Debit', 'central-bank-visa-platinum-debit', NULL),
  ('BANDHAN', 'credit', 'Bandhan Bank Lumina', 'bandhan-bank-lumina', 'https://creditcards.bandhan.bank.in/card-details/Lumina/'),
  ('BANDHAN', 'credit', 'Bandhan Bank Flare', 'bandhan-bank-flare', 'https://creditcards.bandhan.bank.in/card-details/Flare/'),
  ('BANDHAN', 'credit', 'Bandhan Bank Ignite', 'bandhan-bank-ignite', 'https://creditcards.bandhan.bank.in/card-details/Ignite/'),
  ('BANDHAN', 'credit', 'Bandhan Bank Sparks', 'bandhan-bank-sparks', 'https://creditcards.bandhan.bank.in/card-details/Sparks/'),
  ('BANDHAN', 'debit', 'Bandhan Bank Legacy Debit', 'bandhan-bank-legacy-debit', 'https://bandhan.bank.in/personal/debit-card/legacy-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank Elite Plus Debit', 'bandhan-bank-elite-plus-debit', 'https://bandhan.bank.in/personal/debit-card/elite-plus-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank Elite Debit', 'bandhan-bank-elite-debit', 'https://bandhan.bank.in/personal/debit-card/elite-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank Mastercard Platinum Debit', 'bandhan-bank-mastercard-platinum-debit', 'https://bandhan.bank.in/personal/debit-card/mastercard-platinum-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank Mastercard Platinum Plus Debit', 'bandhan-bank-mastercard-platinum-plus-debit', 'https://bandhan.bank.in/personal/debit-card/mastercard-platinum-plus-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank Mastercard Titanium Debit', 'bandhan-bank-mastercard-titanium-debit', 'https://bandhan.bank.in/personal/debit-card/mastercard-titanium-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank Visa Platinum Debit', 'bandhan-bank-visa-platinum-debit', 'https://bandhan.bank.in/personal/debit-card/visa-platinum-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank RuPay Platinum Debit', 'bandhan-bank-rupay-platinum-debit', 'https://bandhan.bank.in/personal/debit-card/rupay-platinum-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank Visa Classic Debit', 'bandhan-bank-visa-classic-debit', 'https://bandhan.bank.in/personal/debit-card/visa-classic-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank RuPay Classic Debit', 'bandhan-bank-rupay-classic-debit', 'https://bandhan.bank.in/personal/debit-card/rupay-classic-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank Avni Debit', 'bandhan-bank-avni-debit', 'https://bandhan.bank.in/personal/debit-card/avni-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank PMJDY Debit', 'bandhan-bank-pmjdy-debit', 'https://bandhan.bank.in/personal/debit-card/pradhan-matri-jan-dhan-yojana-debit-card'),
  ('BANDHAN', 'debit', 'Bandhan Bank Business Standard Debit', 'bandhan-bank-business-standard-debit', 'https://bandhan.bank.in/personal/debit-card/business-standard-debit-card'),
  ('HSBC', 'credit', 'HSBC TravelOne', 'hsbc-travelone', 'https://www.hsbc.bank.in/credit-cards/products/travelone'),
  ('HSBC', 'credit', 'HSBC Visa Platinum', 'hsbc-visa-platinum', 'https://www.hsbc.bank.in/credit-cards/products/visa-platinum'),
  ('HSBC', 'credit', 'HSBC Premier', 'hsbc-premier', 'https://www.hsbc.bank.in/credit-cards/products/premier/'),
  ('HSBC', 'credit', 'HSBC Live+', 'hsbc-live-plus', 'https://www.hsbc.bank.in/credit-cards/products/live-plus/'),
  ('HSBC', 'credit', 'HSBC Taj', 'hsbc-taj', 'https://www.hsbc.bank.in/credit-cards/products/taj/'),
  ('HSBC', 'credit', 'HSBC RuPay Platinum', 'hsbc-rupay-platinum', 'https://www.hsbc.bank.in/credit-cards/products/rupay-platinum-credit-card/'),
  ('HSBC', 'credit', 'HSBC RuPay Cashback', 'hsbc-rupay-cashback', 'https://www.hsbc.bank.in/credit-cards/products/rupay-cashback-credit-card/'),
  ('HSBC', 'debit', 'HSBC Premier Debit', 'hsbc-premier-debit', NULL),
  ('HSBC', 'debit', 'HSBC Advance Debit', 'hsbc-advance-debit', NULL)
) AS v(code, card_type, name, slug, url)
JOIN "banks" b ON b."code" = v.code
ON CONFLICT ("bank_id", "card_type", "slug") DO UPDATE
  SET "product_url" = EXCLUDED."product_url"
  WHERE EXCLUDED."product_url" IS NOT NULL;--> statement-breakpoint

-- Dropped only where nobody selected one. A product a real member picked
-- stays, vague name and all, rather than breaking their card.
DELETE FROM "card_products" p
USING "banks" b, (VALUES
  ('UNION', 'credit', 'union-bank-platinum'),
  ('UNION', 'credit', 'union-bank-classic'),
  ('UNION', 'credit', 'union-bank-signature'),
  ('UNION', 'debit', 'union-bank-classic-debit'),
  ('UNION', 'debit', 'union-bank-platinum-debit'),
  ('UNION', 'debit', 'union-bank-rupay-debit'),
  ('BANDHAN', 'credit', 'bandhan-bank-standard'),
  ('BANDHAN', 'credit', 'bandhan-bank-select'),
  ('BANDHAN', 'credit', 'bandhan-bank-premium'),
  ('BANDHAN', 'credit', 'bandhan-bank-one'),
  ('BANDHAN', 'debit', 'bandhan-classic-debit'),
  ('BANDHAN', 'debit', 'bandhan-platinum-debit'),
  ('BANDHAN', 'debit', 'bandhan-rupay-debit'),
  ('HSBC', 'credit', 'hsbc-cashback'),
  ('HSBC', 'credit', 'hsbc-platinum'),
  ('HSBC', 'credit', 'hsbc-premier-mastercard'),
  ('PNB', 'credit', 'pnb-global-gold'),
  ('PNB', 'credit', 'pnb-global-classic'),
  ('BOB', 'debit', 'bob-classic-debit'),
  ('BOB', 'debit', 'bob-platinum-debit'),
  ('CENTRAL', 'debit', 'central-bank-classic-debit'),
  ('CENTRAL', 'debit', 'central-bank-platinum-debit'),
  ('CENTRAL', 'debit', 'central-bank-rupay-debit')
) AS v(code, card_type, slug)
WHERE b."code" = v.code
  AND p."bank_id" = b."id"
  AND p."card_type" = v.card_type::"card_type"
  AND p."slug" = v.slug
  AND NOT EXISTS (SELECT 1 FROM "cards" c WHERE c."product_id" = p."id");
