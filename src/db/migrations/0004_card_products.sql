-- Card products replace free-text nicknames.
--
-- The question this app answers names a product: an offer says "10% on
-- Airtel Axis", not "10% on whatever you call your card". Matching nicknames
-- could never answer that reliably, so a card now references a catalogue row.
--
-- Cards also lose last4 and expiry entirely. Neither was needed to answer
-- "who has this card" — under the product's framing you ask your friend to
-- make the purchase, so you never need their digits or expiry date. Dropping
-- them removes the most sensitive columns in the schema outright.
--
-- Existing cards are PRESERVED. Each card's old free-text nickname becomes a
-- product in the catalogue, marked unverified and attributed to nobody --
-- exactly what the "Other" option produces. That keeps a real user's cards
-- intact through the change; deleting them would have been a data loss the
-- user never asked for.
--
-- last4 and expiry ARE dropped, which is deliberate and requested: nothing
-- in this product needs them, and removing the columns is the only way to be
-- sure they are not stored.

CREATE TYPE "public"."field_visibility" AS ENUM('nobody', 'friends', 'everyone');--> statement-breakpoint

CREATE TABLE "card_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_id" uuid NOT NULL,
	"card_type" "card_type" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "card_products" ADD CONSTRAINT "card_products_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_products" ADD CONSTRAINT "card_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_products_unique" ON "card_products" USING btree ("bank_id","card_type","slug");--> statement-breakpoint
CREATE INDEX "card_products_bank_type_idx" ON "card_products" USING btree ("bank_id","card_type");--> statement-breakpoint
CREATE INDEX "card_products_slug_idx" ON "card_products" USING btree ("slug" text_pattern_ops);--> statement-breakpoint

-- Seeded products are pre-verified; anything a user adds later is not.
INSERT INTO "card_products" ("bank_id", "card_type", "name", "slug", "is_verified")
SELECT b."id", v.card_type::"card_type", v.name, v.slug, true
FROM (VALUES
  ('HDFC', 'credit', 'HDFC Millennia', 'hdfc-millennia'),
  ('HDFC', 'credit', 'HDFC Regalia', 'hdfc-regalia'),
  ('HDFC', 'credit', 'HDFC Regalia Gold', 'hdfc-regalia-gold'),
  ('HDFC', 'credit', 'HDFC MoneyBack+', 'hdfc-moneyback-plus'),
  ('HDFC', 'credit', 'HDFC Infinia', 'hdfc-infinia'),
  ('HDFC', 'credit', 'HDFC Infinia Metal', 'hdfc-infinia-metal'),
  ('HDFC', 'credit', 'HDFC Diners Club Black', 'hdfc-diners-club-black'),
  ('HDFC', 'credit', 'HDFC Diners Club Privilege', 'hdfc-diners-club-privilege'),
  ('HDFC', 'credit', 'HDFC Freedom', 'hdfc-freedom'),
  ('HDFC', 'credit', 'HDFC Business Regalia', 'hdfc-business-regalia'),
  ('HDFC', 'credit', 'Swiggy HDFC', 'swiggy-hdfc'),
  ('HDFC', 'credit', 'Tata Neu Infinity HDFC', 'tata-neu-infinity-hdfc'),
  ('HDFC', 'credit', 'Tata Neu Plus HDFC', 'tata-neu-plus-hdfc'),
  ('HDFC', 'credit', 'IndianOil HDFC', 'indianoil-hdfc'),
  ('HDFC', 'credit', '6E Rewards IndiGo HDFC', '6e-rewards-indigo-hdfc'),
  ('HDFC', 'credit', 'Marriott Bonvoy HDFC', 'marriott-bonvoy-hdfc'),
  ('HDFC', 'credit', 'Shoppers Stop HDFC', 'shoppers-stop-hdfc'),
  ('HDFC', 'debit', 'HDFC Millennia Debit', 'hdfc-millennia-debit'),
  ('HDFC', 'debit', 'HDFC EasyShop Platinum Debit', 'hdfc-easyshop-platinum-debit'),
  ('HDFC', 'debit', 'HDFC Rewards Debit', 'hdfc-rewards-debit'),
  ('HDFC', 'debit', 'HDFC Imperia Platinum Debit', 'hdfc-imperia-platinum-debit'),
  ('HDFC', 'debit', 'HDFC Times Points Debit', 'hdfc-times-points-debit'),
  ('HDFC', 'debit', 'HDFC RuPay Premium Debit', 'hdfc-rupay-premium-debit'),
  ('AXIS', 'credit', 'Flipkart Axis Bank', 'flipkart-axis-bank'),
  ('AXIS', 'credit', 'Airtel Axis Bank', 'airtel-axis-bank'),
  ('AXIS', 'credit', 'Axis Magnus', 'axis-magnus'),
  ('AXIS', 'credit', 'Axis Burgundy Private', 'axis-burgundy-private'),
  ('AXIS', 'credit', 'Axis Atlas', 'axis-atlas'),
  ('AXIS', 'credit', 'Axis ACE', 'axis-ace'),
  ('AXIS', 'credit', 'Axis NEO', 'axis-neo'),
  ('AXIS', 'credit', 'Axis MY ZONE', 'axis-my-zone'),
  ('AXIS', 'credit', 'Axis Select', 'axis-select'),
  ('AXIS', 'credit', 'Axis Privilege', 'axis-privilege'),
  ('AXIS', 'credit', 'Axis Reserve', 'axis-reserve'),
  ('AXIS', 'credit', 'Axis Horizon', 'axis-horizon'),
  ('AXIS', 'credit', 'Axis Vistara', 'axis-vistara'),
  ('AXIS', 'credit', 'Axis Vistara Infinite', 'axis-vistara-infinite'),
  ('AXIS', 'credit', 'IndianOil Axis Bank', 'indianoil-axis-bank'),
  ('AXIS', 'credit', 'Samsung Axis Bank Infinite', 'samsung-axis-bank-infinite'),
  ('AXIS', 'credit', 'Samsung Axis Bank Signature', 'samsung-axis-bank-signature'),
  ('AXIS', 'credit', 'Axis Rewards', 'axis-rewards'),
  ('AXIS', 'debit', 'Axis Burgundy Debit', 'axis-burgundy-debit'),
  ('AXIS', 'debit', 'Axis Priority Debit', 'axis-priority-debit'),
  ('AXIS', 'debit', 'Axis Liberty Debit', 'axis-liberty-debit'),
  ('AXIS', 'debit', 'Axis Titanium Debit', 'axis-titanium-debit'),
  ('AXIS', 'debit', 'Axis Prestige Debit', 'axis-prestige-debit'),
  ('AXIS', 'debit', 'Axis RuPay Debit', 'axis-rupay-debit'),
  ('SBI', 'credit', 'SBI SimplyCLICK', 'sbi-simplyclick'),
  ('SBI', 'credit', 'SBI SimplySAVE', 'sbi-simplysave'),
  ('SBI', 'credit', 'SBI Card ELITE', 'sbi-card-elite'),
  ('SBI', 'credit', 'SBI Card PRIME', 'sbi-card-prime'),
  ('SBI', 'credit', 'SBI Cashback Card', 'sbi-cashback-card'),
  ('SBI', 'credit', 'IRCTC SBI Platinum', 'irctc-sbi-platinum'),
  ('SBI', 'credit', 'BPCL SBI Octane', 'bpcl-sbi-octane'),
  ('SBI', 'credit', 'BPCL SBI Card', 'bpcl-sbi-card'),
  ('SBI', 'credit', 'Air India SBI Signature', 'air-india-sbi-signature'),
  ('SBI', 'credit', 'Tata Neu Infinity SBI', 'tata-neu-infinity-sbi'),
  ('SBI', 'credit', 'Club Vistara SBI', 'club-vistara-sbi'),
  ('SBI', 'credit', 'SBI Card PULSE', 'sbi-card-pulse'),
  ('SBI', 'credit', 'SBI Card Unnati', 'sbi-card-unnati'),
  ('SBI', 'debit', 'SBI Classic Debit', 'sbi-classic-debit'),
  ('SBI', 'debit', 'SBI Global International Debit', 'sbi-global-international-debit'),
  ('SBI', 'debit', 'SBI Gold International Debit', 'sbi-gold-international-debit'),
  ('SBI', 'debit', 'SBI Platinum International Debit', 'sbi-platinum-international-debit'),
  ('SBI', 'debit', 'SBI RuPay NCMC Debit', 'sbi-rupay-ncmc-debit'),
  ('SBI', 'debit', 'SBI Yuva Debit', 'sbi-yuva-debit'),
  ('ICICI', 'credit', 'Amazon Pay ICICI', 'amazon-pay-icici'),
  ('ICICI', 'credit', 'ICICI Coral', 'icici-coral'),
  ('ICICI', 'credit', 'ICICI Rubyx', 'icici-rubyx'),
  ('ICICI', 'credit', 'ICICI Sapphiro', 'icici-sapphiro'),
  ('ICICI', 'credit', 'ICICI Emeralde', 'icici-emeralde'),
  ('ICICI', 'credit', 'ICICI Emeralde Private Metal', 'icici-emeralde-private-metal'),
  ('ICICI', 'credit', 'MakeMyTrip ICICI', 'makemytrip-icici'),
  ('ICICI', 'credit', 'HPCL Super Saver ICICI', 'hpcl-super-saver-icici'),
  ('ICICI', 'credit', 'Manchester United ICICI', 'manchester-united-icici'),
  ('ICICI', 'credit', 'ICICI Platinum Chip', 'icici-platinum-chip'),
  ('ICICI', 'credit', 'ICICI Expressions', 'icici-expressions'),
  ('ICICI', 'debit', 'ICICI Coral Debit', 'icici-coral-debit'),
  ('ICICI', 'debit', 'ICICI Rubyx Debit', 'icici-rubyx-debit'),
  ('ICICI', 'debit', 'ICICI Sapphiro Debit', 'icici-sapphiro-debit'),
  ('ICICI', 'debit', 'ICICI Expressions Debit', 'icici-expressions-debit'),
  ('ICICI', 'debit', 'ICICI Platinum Chip Debit', 'icici-platinum-chip-debit'),
  ('KOTAK', 'credit', 'Kotak 811 Dream Different', 'kotak-811-dream-different'),
  ('KOTAK', 'credit', 'Kotak League Platinum', 'kotak-league-platinum'),
  ('KOTAK', 'credit', 'Kotak Royale Signature', 'kotak-royale-signature'),
  ('KOTAK', 'credit', 'Kotak Zen Signature', 'kotak-zen-signature'),
  ('KOTAK', 'credit', 'Kotak IndianOil', 'kotak-indianoil'),
  ('KOTAK', 'credit', 'Myntra Kotak', 'myntra-kotak'),
  ('KOTAK', 'credit', 'Kotak White', 'kotak-white'),
  ('KOTAK', 'credit', 'Kotak White Reserve', 'kotak-white-reserve'),
  ('KOTAK', 'credit', 'PVR INOX Kotak', 'pvr-inox-kotak'),
  ('KOTAK', 'credit', 'Kotak Solitaire', 'kotak-solitaire'),
  ('KOTAK', 'credit', 'Kotak Mojo Platinum', 'kotak-mojo-platinum'),
  ('KOTAK', 'debit', 'Kotak 811 Debit', 'kotak-811-debit'),
  ('KOTAK', 'debit', 'Kotak Platinum Debit', 'kotak-platinum-debit'),
  ('KOTAK', 'debit', 'Kotak Privy League Debit', 'kotak-privy-league-debit'),
  ('KOTAK', 'debit', 'Kotak Classic Debit', 'kotak-classic-debit'),
  ('KOTAK', 'debit', 'Kotak Silk Debit', 'kotak-silk-debit'),
  ('IDFC', 'credit', 'IDFC FIRST Select', 'idfc-first-select'),
  ('IDFC', 'credit', 'IDFC FIRST Classic', 'idfc-first-classic'),
  ('IDFC', 'credit', 'IDFC FIRST Millennia', 'idfc-first-millennia'),
  ('IDFC', 'credit', 'IDFC FIRST Wealth', 'idfc-first-wealth'),
  ('IDFC', 'credit', 'IDFC FIRST WOW', 'idfc-first-wow'),
  ('IDFC', 'credit', 'IDFC FIRST Power', 'idfc-first-power'),
  ('IDFC', 'credit', 'IDFC FIRST Power+', 'idfc-first-power-plus'),
  ('IDFC', 'credit', 'Club Vistara IDFC FIRST', 'club-vistara-idfc-first'),
  ('IDFC', 'credit', 'IDFC FIRST SWYP', 'idfc-first-swyp'),
  ('IDFC', 'debit', 'IDFC FIRST Visa Signature Debit', 'idfc-first-visa-signature-debit'),
  ('IDFC', 'debit', 'IDFC FIRST Platinum Debit', 'idfc-first-platinum-debit'),
  ('IDFC', 'debit', 'IDFC FIRST Wealth Debit', 'idfc-first-wealth-debit'),
  ('IDFC', 'debit', 'IDFC FIRST Classic Debit', 'idfc-first-classic-debit'),
  ('AMEX', 'credit', 'Amex Membership Rewards', 'amex-membership-rewards'),
  ('AMEX', 'credit', 'Amex Platinum Travel', 'amex-platinum-travel'),
  ('AMEX', 'credit', 'Amex Platinum Charge', 'amex-platinum-charge'),
  ('AMEX', 'credit', 'Amex Gold Charge', 'amex-gold-charge'),
  ('AMEX', 'credit', 'Amex SmartEarn', 'amex-smartearn'),
  ('AMEX', 'credit', 'Amex Platinum Reserve', 'amex-platinum-reserve'),
  ('RBL', 'credit', 'RBL ShopRite', 'rbl-shoprite'),
  ('RBL', 'credit', 'RBL Platinum Maxima', 'rbl-platinum-maxima'),
  ('RBL', 'credit', 'RBL Platinum Maxima Plus', 'rbl-platinum-maxima-plus'),
  ('RBL', 'credit', 'RBL Icon', 'rbl-icon'),
  ('RBL', 'credit', 'RBL World Safari', 'rbl-world-safari'),
  ('RBL', 'credit', 'RBL Popcorn', 'rbl-popcorn'),
  ('RBL', 'credit', 'Bajaj Finserv RBL SuperCard', 'bajaj-finserv-rbl-supercard'),
  ('RBL', 'credit', 'RBL Insignia Preferred Banking', 'rbl-insignia-preferred-banking'),
  ('RBL', 'debit', 'RBL Classic Debit', 'rbl-classic-debit'),
  ('RBL', 'debit', 'RBL Signature Debit', 'rbl-signature-debit'),
  ('RBL', 'debit', 'RBL Platinum Debit', 'rbl-platinum-debit'),
  ('INDUSIND', 'credit', 'IndusInd Legend', 'indusind-legend'),
  ('INDUSIND', 'credit', 'IndusInd Pinnacle', 'indusind-pinnacle'),
  ('INDUSIND', 'credit', 'IndusInd Iconia', 'indusind-iconia'),
  ('INDUSIND', 'credit', 'IndusInd Platinum Aura Edge', 'indusind-platinum-aura-edge'),
  ('INDUSIND', 'credit', 'IndusInd EazyDiner', 'indusind-eazydiner'),
  ('INDUSIND', 'credit', 'IndusInd Tiger', 'indusind-tiger'),
  ('INDUSIND', 'credit', 'IndusInd Nexxt', 'indusind-nexxt'),
  ('INDUSIND', 'credit', 'IndusInd Platinum RuPay', 'indusind-platinum-rupay'),
  ('INDUSIND', 'debit', 'IndusInd Platinum Debit', 'indusind-platinum-debit'),
  ('INDUSIND', 'debit', 'IndusInd Signature Debit', 'indusind-signature-debit'),
  ('INDUSIND', 'debit', 'IndusInd Classic Debit', 'indusind-classic-debit'),
  ('YES', 'credit', 'YES Prosperity Rewards Plus', 'yes-prosperity-rewards-plus'),
  ('YES', 'credit', 'YES Premia', 'yes-premia'),
  ('YES', 'credit', 'YES First Preferred', 'yes-first-preferred'),
  ('YES', 'credit', 'YES First Exclusive', 'yes-first-exclusive'),
  ('YES', 'credit', 'YES Marquee', 'yes-marquee'),
  ('YES', 'credit', 'Paisabazaar PaisaSave YES', 'paisabazaar-paisasave-yes'),
  ('YES', 'credit', 'YES EMI Card', 'yes-emi-card'),
  ('YES', 'debit', 'YES Prosperity Debit', 'yes-prosperity-debit'),
  ('YES', 'debit', 'YES First Debit', 'yes-first-debit'),
  ('YES', 'debit', 'YES Platinum Debit', 'yes-platinum-debit'),
  ('BOB', 'credit', 'BOB Eterna', 'bob-eterna'),
  ('BOB', 'credit', 'BOB Premier', 'bob-premier'),
  ('BOB', 'credit', 'BOB Select', 'bob-select'),
  ('BOB', 'credit', 'BOB Easy', 'bob-easy'),
  ('BOB', 'credit', 'BOB Snapdeal', 'bob-snapdeal'),
  ('BOB', 'credit', 'IRCTC BOB', 'irctc-bob'),
  ('BOB', 'credit', 'BOB Varunah', 'bob-varunah'),
  ('BOB', 'debit', 'BOB Classic Debit', 'bob-classic-debit'),
  ('BOB', 'debit', 'BOB Platinum Debit', 'bob-platinum-debit'),
  ('BOB', 'debit', 'BOB RuPay Select Debit', 'bob-rupay-select-debit'),
  ('PNB', 'credit', 'PNB RuPay Select', 'pnb-rupay-select'),
  ('PNB', 'credit', 'PNB RuPay Platinum', 'pnb-rupay-platinum'),
  ('PNB', 'credit', 'PNB Global Gold', 'pnb-global-gold'),
  ('PNB', 'credit', 'PNB Global Classic', 'pnb-global-classic'),
  ('PNB', 'credit', 'PNB Patanjali RuPay Platinum', 'pnb-patanjali-rupay-platinum'),
  ('PNB', 'debit', 'PNB Platinum Debit', 'pnb-platinum-debit'),
  ('PNB', 'debit', 'PNB Classic Debit', 'pnb-classic-debit'),
  ('PNB', 'debit', 'PNB RuPay Debit', 'pnb-rupay-debit'),
  ('CANARA', 'credit', 'Canara RuPay Select', 'canara-rupay-select'),
  ('CANARA', 'credit', 'Canara Visa Platinum', 'canara-visa-platinum'),
  ('CANARA', 'credit', 'Canara Mastercard Platinum', 'canara-mastercard-platinum'),
  ('CANARA', 'credit', 'Canara RuPay Platinum', 'canara-rupay-platinum'),
  ('CANARA', 'debit', 'Canara Classic Debit', 'canara-classic-debit'),
  ('CANARA', 'debit', 'Canara Platinum Debit', 'canara-platinum-debit'),
  ('CANARA', 'debit', 'Canara RuPay Debit', 'canara-rupay-debit'),
  ('UNION', 'credit', 'Union Bank RuPay Select', 'union-bank-rupay-select'),
  ('UNION', 'credit', 'Union Bank Platinum', 'union-bank-platinum'),
  ('UNION', 'credit', 'Union Bank Classic', 'union-bank-classic'),
  ('UNION', 'credit', 'Union Bank Signature', 'union-bank-signature'),
  ('UNION', 'debit', 'Union Bank Classic Debit', 'union-bank-classic-debit'),
  ('UNION', 'debit', 'Union Bank Platinum Debit', 'union-bank-platinum-debit'),
  ('UNION', 'debit', 'Union Bank RuPay Debit', 'union-bank-rupay-debit'),
  ('IDBI', 'credit', 'IDBI Aspire', 'idbi-aspire'),
  ('IDBI', 'credit', 'IDBI Imperium', 'idbi-imperium'),
  ('IDBI', 'credit', 'IDBI Winnings', 'idbi-winnings'),
  ('IDBI', 'credit', 'IDBI Royale Signature', 'idbi-royale-signature'),
  ('IDBI', 'credit', 'IDBI Euphoria', 'idbi-euphoria'),
  ('IDBI', 'debit', 'IDBI Platinum Debit', 'idbi-platinum-debit'),
  ('IDBI', 'debit', 'IDBI RuPay Debit', 'idbi-rupay-debit'),
  ('IDBI', 'debit', 'IDBI Gold Debit', 'idbi-gold-debit'),
  ('FEDERAL', 'credit', 'Federal Bank Celesta', 'federal-bank-celesta'),
  ('FEDERAL', 'credit', 'Federal Bank Imperio', 'federal-bank-imperio'),
  ('FEDERAL', 'credit', 'Federal Bank Signet', 'federal-bank-signet'),
  ('FEDERAL', 'credit', 'Scapia Federal', 'scapia-federal'),
  ('FEDERAL', 'credit', 'Federal Bank RuPay Signet', 'federal-bank-rupay-signet'),
  ('FEDERAL', 'debit', 'Federal Bank Platinum Debit', 'federal-bank-platinum-debit'),
  ('FEDERAL', 'debit', 'Federal Bank Signature Debit', 'federal-bank-signature-debit'),
  ('FEDERAL', 'debit', 'FedFirst Debit', 'fedfirst-debit'),
  ('BOI', 'credit', 'BOI India Card', 'boi-india-card'),
  ('BOI', 'credit', 'BOI Taj Card', 'boi-taj-card'),
  ('BOI', 'credit', 'BOI RuPay Platinum', 'boi-rupay-platinum'),
  ('BOI', 'credit', 'BOI Bharat Card', 'boi-bharat-card'),
  ('BOI', 'debit', 'BOI Classic Debit', 'boi-classic-debit'),
  ('BOI', 'debit', 'BOI Platinum Debit', 'boi-platinum-debit'),
  ('BOI', 'debit', 'BOI RuPay Debit', 'boi-rupay-debit'),
  ('INDIANBANK', 'credit', 'Indian Bank Platinum', 'indian-bank-platinum'),
  ('INDIANBANK', 'credit', 'Indian Bank Gold', 'indian-bank-gold'),
  ('INDIANBANK', 'credit', 'Indian Bank RuPay Select', 'indian-bank-rupay-select'),
  ('INDIANBANK', 'debit', 'Indian Bank Classic Debit', 'indian-bank-classic-debit'),
  ('INDIANBANK', 'debit', 'Indian Bank Platinum Debit', 'indian-bank-platinum-debit'),
  ('INDIANBANK', 'debit', 'Indian Bank RuPay Debit', 'indian-bank-rupay-debit'),
  ('CENTRAL', 'credit', 'Central Bank RuPay Platinum', 'central-bank-rupay-platinum'),
  ('CENTRAL', 'credit', 'Central Bank Aspire', 'central-bank-aspire'),
  ('CENTRAL', 'credit', 'Central Bank Classic', 'central-bank-classic'),
  ('CENTRAL', 'debit', 'Central Bank Classic Debit', 'central-bank-classic-debit'),
  ('CENTRAL', 'debit', 'Central Bank Platinum Debit', 'central-bank-platinum-debit'),
  ('CENTRAL', 'debit', 'Central Bank RuPay Debit', 'central-bank-rupay-debit'),
  ('AUSFB', 'credit', 'AU LIT', 'au-lit'),
  ('AUSFB', 'credit', 'AU Altura', 'au-altura'),
  ('AUSFB', 'credit', 'AU Altura Plus', 'au-altura-plus'),
  ('AUSFB', 'credit', 'AU Vetta', 'au-vetta'),
  ('AUSFB', 'credit', 'AU Zenith', 'au-zenith'),
  ('AUSFB', 'credit', 'AU Zenith+', 'au-zenith-plus'),
  ('AUSFB', 'credit', 'AU Xcite', 'au-xcite'),
  ('AUSFB', 'credit', 'AU InstaPay', 'au-instapay'),
  ('AUSFB', 'credit', 'AU NOMO', 'au-nomo'),
  ('AUSFB', 'debit', 'AU Platinum Debit', 'au-platinum-debit'),
  ('AUSFB', 'debit', 'AU Signature Debit', 'au-signature-debit'),
  ('AUSFB', 'debit', 'AU Royale Debit', 'au-royale-debit'),
  ('BANDHAN', 'credit', 'Bandhan Bank Standard', 'bandhan-bank-standard'),
  ('BANDHAN', 'credit', 'Bandhan Bank Select', 'bandhan-bank-select'),
  ('BANDHAN', 'credit', 'Bandhan Bank Premium', 'bandhan-bank-premium'),
  ('BANDHAN', 'credit', 'Bandhan Bank One', 'bandhan-bank-one'),
  ('BANDHAN', 'debit', 'Bandhan Classic Debit', 'bandhan-classic-debit'),
  ('BANDHAN', 'debit', 'Bandhan Platinum Debit', 'bandhan-platinum-debit'),
  ('BANDHAN', 'debit', 'Bandhan RuPay Debit', 'bandhan-rupay-debit'),
  ('SCB', 'credit', 'Standard Chartered Ultimate', 'standard-chartered-ultimate'),
  ('SCB', 'credit', 'Standard Chartered Platinum Rewards', 'standard-chartered-platinum-rewards'),
  ('SCB', 'credit', 'Standard Chartered Smart', 'standard-chartered-smart'),
  ('SCB', 'credit', 'Standard Chartered Rewards', 'standard-chartered-rewards'),
  ('SCB', 'credit', 'Standard Chartered EaseMyTrip', 'standard-chartered-easemytrip'),
  ('SCB', 'credit', 'Standard Chartered DigiSmart', 'standard-chartered-digismart'),
  ('SCB', 'credit', 'Standard Chartered Manhattan Platinum', 'standard-chartered-manhattan-platinum'),
  ('SCB', 'debit', 'Standard Chartered Platinum Debit', 'standard-chartered-platinum-debit'),
  ('SCB', 'debit', 'Standard Chartered Visa Infinite Debit', 'standard-chartered-visa-infinite-debit'),
  ('HSBC', 'credit', 'HSBC Cashback', 'hsbc-cashback'),
  ('HSBC', 'credit', 'HSBC Platinum', 'hsbc-platinum'),
  ('HSBC', 'credit', 'HSBC Premier Mastercard', 'hsbc-premier-mastercard'),
  ('HSBC', 'credit', 'HSBC TravelOne', 'hsbc-travelone'),
  ('HSBC', 'credit', 'HSBC Visa Platinum', 'hsbc-visa-platinum'),
  ('HSBC', 'debit', 'HSBC Premier Debit', 'hsbc-premier-debit'),
  ('HSBC', 'debit', 'HSBC Advance Debit', 'hsbc-advance-debit'),
  ('CITI', 'credit', 'Citi Cashback', 'citi-cashback'),
  ('CITI', 'credit', 'Citi Rewards', 'citi-rewards'),
  ('CITI', 'credit', 'Citi PremierMiles', 'citi-premiermiles'),
  ('CITI', 'credit', 'Citi Prestige', 'citi-prestige'),
  ('CITI', 'credit', 'Citi IndianOil', 'citi-indianoil'),
  ('CITI', 'credit', 'Citi First Citizen', 'citi-first-citizen'),
  ('CITI', 'debit', 'Citi Platinum Debit', 'citi-platinum-debit'),
  ('CITI', 'debit', 'Citi Priority Debit', 'citi-priority-debit'),
  ('DBS', 'credit', 'DBS Bank Vantage', 'dbs-bank-vantage'),
  ('DBS', 'credit', 'DBS Bank Platinum', 'dbs-bank-platinum'),
  ('DBS', 'credit', 'DBS digibank Rewards', 'dbs-digibank-rewards'),
  ('DBS', 'debit', 'DBS digibank Debit', 'dbs-digibank-debit'),
  ('DBS', 'debit', 'DBS Visa Debit', 'dbs-visa-debit'),
  ('DBS', 'debit', 'DBS Treasures Debit', 'dbs-treasures-debit'),
  ('CSB', 'credit', 'CSB Bank RuPay Credit Card', 'csb-bank-rupay-credit-card'),
  ('CSB', 'credit', 'CSB Bank Yuva Credit Card', 'csb-bank-yuva-credit-card'),
  ('CSB', 'debit', 'CSB Classic Debit', 'csb-classic-debit'),
  ('CSB', 'debit', 'CSB Platinum Debit', 'csb-platinum-debit'),
  ('CSB', 'debit', 'CSB RuPay Debit', 'csb-rupay-debit')
) AS v(code, card_type, name, slug)
JOIN "banks" b ON b."code" = v.code
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Turn every existing nickname into a product.
--
-- The slug expression mirrors productSlug() in TypeScript: '+' and '&' are
-- spelled out BEFORE punctuation is stripped, so "Power" and "Power+" do not
-- collapse into one product.
INSERT INTO "card_products" ("bank_id", "card_type", "name", "slug", "is_verified")
SELECT DISTINCT
  c."bank_id",
  c."card_type",
  c."nickname",
  trim(both '-' from regexp_replace(
    replace(replace(lower(c."nickname"), '+', ' plus '), '&', ' and '),
    '[^a-z0-9]+', '-', 'g')),
  false
FROM "cards" c
WHERE trim(both '-' from regexp_replace(
    replace(replace(lower(c."nickname"), '+', ' plus '), '&', ' and '),
    '[^a-z0-9]+', '-', 'g')) <> ''
ON CONFLICT DO NOTHING;--> statement-breakpoint

DROP TABLE "card_sharing_settings" CASCADE;--> statement-breakpoint
DROP TYPE "public"."card_field";--> statement-breakpoint

ALTER TABLE "cards" DROP CONSTRAINT IF EXISTS "cards_last4_digits";--> statement-breakpoint
DROP INDEX IF EXISTS "cards_bank_type_network_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "cards_bank_bin_idx";--> statement-breakpoint

ALTER TABLE "cards" DROP COLUMN "variant";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "last4";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "expiry_ct";--> statement-breakpoint

ALTER TABLE "cards" ADD COLUMN "product_id" uuid;--> statement-breakpoint

-- Backfill from the products just created.
UPDATE "cards" c
SET "product_id" = p."id"
FROM "card_products" p
WHERE p."bank_id" = c."bank_id"
  AND p."card_type" = c."card_type"
  AND p."slug" = trim(both '-' from regexp_replace(
    replace(replace(lower(c."nickname"), '+', ' plus '), '&', ' and '),
    '[^a-z0-9]+', '-', 'g'));--> statement-breakpoint

-- Only a card whose nickname slugged to nothing can be unmatched; such a row
-- cannot be represented in the new model.
DELETE FROM "cards" WHERE "product_id" IS NULL;--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "product_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "bin_visibility" "field_visibility" DEFAULT 'friends' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_product_id_card_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."card_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_product_idx" ON "cards" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "cards_network_idx" ON "cards" USING btree ("network");--> statement-breakpoint
CREATE INDEX "cards_bin_idx" ON "cards" USING btree ("bin" text_pattern_ops);
--> statement-breakpoint
-- Dropped last, once nothing else needs them.
ALTER TABLE "cards" DROP COLUMN "nickname";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "bank_id";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "card_type";
