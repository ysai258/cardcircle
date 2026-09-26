-- The four banks that looked unreadable, and a link that was wrong.
--
-- AU, IDBI, DBS and Bank of India were left out of every earlier batch as
-- "refuses automated requests". Three of the four were the same false
-- negative as YES Bank: they reject curl and bundled Chromium on the TLS
-- fingerprint, and render normally for the real Chrome binary. Only Bank of
-- India is genuinely shut -- its Cloudflare challenge does not resolve
-- headless, so its seven seeded names stand untouched and unverified.
--
-- 58 products added, 56 of them linked; 15 seeded names that already named
-- a real card gain one. IDBI goes from 8 products, none linked, to 22 with
-- every one linked.
--
-- HOW EACH PAGE WAS CONFIRMED
--
-- IDBI's card pages all render the same banner heading, so the heading
-- proves nothing; each was read further down instead, where the page names
-- its own card ("Royale Signature Credit Card", "Euphoria Credit Card").
-- That also corrected the seeded "Euphoria World" to "Euphoria".
--
-- AU's tiles carry no links, so the names came from the tiles and the URLs
-- from the surrounding markup; four cards (Xcite, Xcite Ultra, Xcite Ace,
-- InstaPay) have no page at all and are added name-only.
--
-- A LINK THAT POINTED AT THE WRONG CARD
--
-- csb.bank.in/csb-bank-edge-credit-card renders <h1>Edge+ CSB Bank RuPay
-- Credit Card</h1>. It is the Edge PLUS page. 0009 had the plain Edge card
-- pointing at it, which sent anyone asking about Edge to a different card.
-- Edge now points at Jupiter's own Edge page and Edge+ at CSB's, both read
-- back from the pages themselves. CSB is in the insert list for that fix
-- alone; none of its other entries change.
--
-- Federal's site rate-limits after a few requests, so five of its credit
-- URLs and seven debit ones are taken from its own card listing without a
-- page read. Two were read and confirmed before the block: the Imperio page
-- names itself "Federal Bank Mastercard Imperio Credit Card", and the
-- visa-imperio path Federal also lists renders the CELESTA heading -- so
-- that one is deliberately not used.

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
  ('IDBI', 'credit', 'IDBI Aspire', 'idbi-aspire', 'https://www.idbi.bank.in/aspire-credit-card.aspx'),
  ('IDBI', 'credit', 'IDBI Imperium', 'idbi-imperium', 'https://www.idbi.bank.in/Imperium-credit-card.aspx'),
  ('IDBI', 'credit', 'IDBI Winnings', 'idbi-winnings', 'https://www.idbi.bank.in/Winnings-credit-card.aspx'),
  ('IDBI', 'credit', 'IDBI Royale Signature', 'idbi-royale-signature', 'https://www.idbi.bank.in/royal-credit-card.aspx'),
  ('IDBI', 'credit', 'IDBI Euphoria', 'idbi-euphoria', 'https://www.idbi.bank.in/Euphoria-credit-card.aspx'),
  ('IDBI', 'credit', 'IDBI LICCSL Lumine', 'idbi-liccsl-lumine', 'https://www.idbi.bank.in/Lumine-credit-card.aspx'),
  ('IDBI', 'credit', 'IDBI LICCSL Eclat', 'idbi-liccsl-eclat', 'https://www.idbi.bank.in/Eclat-credit-card.aspx'),
  ('IDBI', 'debit', 'IDBI Visa Signature PayWave Debit', 'idbi-visa-signature-paywave-debit', 'https://www.idbi.bank.in/signature_debit_card.aspx'),
  ('IDBI', 'debit', 'IDBI Visa Platinum PayWave Debit', 'idbi-visa-platinum-paywave-debit', 'https://www.idbi.bank.in/platinum-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI Visa Classic PayWave Debit', 'idbi-visa-classic-paywave-debit', 'https://www.idbi.bank.in/classic-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI Visa Gold Debit', 'idbi-visa-gold-debit', 'https://www.idbi.bank.in/gold-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI Visa Business Debit', 'idbi-visa-business-debit', 'https://www.idbi.bank.in/visa-business-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI Visa Women''s PayWave Debit', 'idbi-visa-women-s-paywave-debit', 'https://www.idbi.bank.in/visa-women-paywave-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI Visa Being Me PayWave Debit', 'idbi-visa-being-me-paywave-debit', 'https://www.idbi.bank.in/being-me-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI Visa Kids PayWave Debit', 'idbi-visa-kids-paywave-debit', 'https://www.idbi.bank.in/visa-kids-paywave-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI Mastercard Classic Debit', 'idbi-mastercard-classic-debit', 'https://www.idbi.bank.in/mastercard_classic-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI Mastercard Platinum Debit', 'idbi-mastercard-platinum-debit', 'https://www.idbi.bank.in/mastercard-platinum-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI RuPay Select Opulentia NCMC Debit', 'idbi-rupay-select-opulentia-ncmc-debit', 'https://www.idbi.bank.in/rupay-select-opulentia-ncmc-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI RuPay Platinum NCMC Debit', 'idbi-rupay-platinum-ncmc-debit', 'https://www.idbi.bank.in/rupay_platinum_NCMC_debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI RuPay Classic NCMC Debit', 'idbi-rupay-classic-ncmc-debit', 'https://www.idbi.bank.in/rupay_classic_NCMC_debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI RuPay Women''s Debit', 'idbi-rupay-women-s-debit', 'https://www.idbi.bank.in/rupay-women-debit-card.aspx'),
  ('IDBI', 'debit', 'IDBI RuPay Mudra Debit', 'idbi-rupay-mudra-debit', 'https://www.idbi.bank.in/rupay-mudra-debit-card.aspx'),
  ('FEDERAL', 'credit', 'Federal Bank Celesta', 'federal-bank-celesta', 'https://www.federal.bank.in/celesta-credit-card'),
  ('FEDERAL', 'credit', 'Federal Bank Imperio', 'federal-bank-imperio', 'https://www.federal.bank.in/imperio-credit-card'),
  ('FEDERAL', 'credit', 'Federal Bank Signet', 'federal-bank-signet', 'https://www.federal.bank.in/signet-credit-card'),
  ('FEDERAL', 'credit', 'Scapia Federal', 'scapia-federal', NULL),
  ('FEDERAL', 'credit', 'Federal Bank RuPay Signet', 'federal-bank-rupay-signet', 'https://www.federal.bank.in/rupay-signet-credit-card'),
  ('FEDERAL', 'credit', 'Edge Federal Bank VISA Credit Card (Jupiter)', 'edge-federal-bank-visa-credit-card', NULL),
  ('FEDERAL', 'credit', 'Federal Bank RuPay Wave', 'federal-bank-rupay-wave', 'https://www.federal.bank.in/rupay-wave-credit-card'),
  ('FEDERAL', 'credit', 'Fed StarBiz Visa', 'fed-starbiz-visa', 'https://www.federal.bank.in/fed-starbiz-credit-card-visa'),
  ('FEDERAL', 'credit', 'Fed StarBiz RuPay', 'fed-starbiz-rupay', 'https://www.federal.bank.in/fed-starbiz-credit-card-rupay'),
  ('FEDERAL', 'debit', 'FedFirst Debit', 'fedfirst-debit', 'https://www.federal.bank.in/fedfirst-contactless-debit-card'),
  ('FEDERAL', 'debit', 'Federal Bank Visa Celesta Debit', 'federal-bank-visa-celesta-debit', 'https://www.federal.bank.in/visa-celesta-contactless-cards'),
  ('FEDERAL', 'debit', 'Federal Bank Visa Imperio Debit', 'federal-bank-visa-imperio-debit', 'https://www.federal.bank.in/visa-imperio-contactless-cards'),
  ('FEDERAL', 'debit', 'Federal Bank Visa Crown Debit', 'federal-bank-visa-crown-debit', 'https://www.federal.bank.in/visa-crown-contactless-debit-cards'),
  ('FEDERAL', 'debit', 'Federal Bank Mastercard Celesta Debit', 'federal-bank-mastercard-celesta-debit', 'https://www.federal.bank.in/celesta-personal-contactless-debit-card'),
  ('FEDERAL', 'debit', 'Federal Bank Mastercard Imperio Debit', 'federal-bank-mastercard-imperio-debit', 'https://www.federal.bank.in/imperio-personal-contactless-debit-card'),
  ('FEDERAL', 'debit', 'Federal Bank Mastercard Crown Debit', 'federal-bank-mastercard-crown-debit', 'https://www.federal.bank.in/crown-contactless-debit-card'),
  ('FEDERAL', 'debit', 'Federal Bank RuPay PMJDY Debit', 'federal-bank-rupay-pmjdy-debit', 'https://www.federal.bank.in/rupay-pmjdy-debit-card'),
  ('AUSFB', 'credit', 'AU LIT', 'au-lit', 'https://www.au.bank.in/personal-banking/credit-cards/lit-credit-card'),
  ('AUSFB', 'credit', 'AU Altura', 'au-altura', 'https://www.au.bank.in/personal-banking/credit-cards/altura-credit-card'),
  ('AUSFB', 'credit', 'AU Altura Plus', 'au-altura-plus', 'https://www.au.bank.in/personal-banking/credit-cards/altura-plus-credit-card'),
  ('AUSFB', 'credit', 'AU Vetta', 'au-vetta', 'https://www.au.bank.in/personal-banking/credit-cards/vetta-credit-card'),
  ('AUSFB', 'credit', 'AU Zenith', 'au-zenith', 'https://www.au.bank.in/personal-banking/credit-cards/zenith-credit-card'),
  ('AUSFB', 'credit', 'AU Zenith+', 'au-zenith-plus', 'https://www.au.bank.in/premium-banking/credit-cards/zenith-plus-credit-card'),
  ('AUSFB', 'credit', 'AU Xcite', 'au-xcite', NULL),
  ('AUSFB', 'credit', 'AU InstaPay', 'au-instapay', NULL),
  ('AUSFB', 'credit', 'AU NOMO', 'au-nomo', 'https://www.au.bank.in/personal-banking/credit-cards/nomo-credit-card'),
  ('AUSFB', 'credit', 'AU Ananta', 'au-ananta', 'https://www.au.bank.in/personal-banking/credit-cards/ananta-credit-card'),
  ('AUSFB', 'credit', 'AU Laksya', 'au-laksya', 'https://www.au.bank.in/personal-banking/credit-cards/laksya-credit-card'),
  ('AUSFB', 'credit', 'AU Tejas', 'au-tejas', 'https://www.au.bank.in/personal-banking/credit-cards/tejas-credit-card'),
  ('AUSFB', 'credit', 'AU Prathama', 'au-prathama', 'https://www.au.bank.in/personal-banking/credit-cards/prathama-credit-card'),
  ('AUSFB', 'credit', 'AU CA Metal', 'au-ca-metal', 'https://www.au.bank.in/personal-banking/credit-cards/ca-credit-card'),
  ('AUSFB', 'credit', 'AU CS', 'au-cs', 'https://www.au.bank.in/personal-banking/credit-cards/au-cs-credit-card'),
  ('AUSFB', 'credit', 'AU Spont', 'au-spont', 'https://www.au.bank.in/personal-banking/credit-cards/au-spont-credit-card'),
  ('AUSFB', 'credit', 'AU Kosmo', 'au-kosmo', 'https://www.au.bank.in/personal-banking/credit-cards/kosmo-credit-card'),
  ('AUSFB', 'credit', 'AU Traverse for NRIs', 'au-traverse-for-nris', 'https://www.au.bank.in/personal-banking/credit-cards/traverse-credit-card'),
  ('AUSFB', 'credit', 'AU Zaggle', 'au-zaggle', 'https://www.au.bank.in/personal-banking/credit-cards/au-zaggle-credit-card'),
  ('AUSFB', 'credit', 'CheQ AU', 'cheq-au', 'https://www.au.bank.in/personal-banking/credit-cards/cheq-au-credit-card'),
  ('AUSFB', 'credit', 'Paytm AU', 'paytm-au', 'https://www.au.bank.in/personal-banking/credit-cards/paytm-au-credit-card'),
  ('AUSFB', 'credit', 'ixigo AU', 'ixigo-au', 'https://www.au.bank.in/personal-banking/credit-cards/ixigo-au-credit-card'),
  ('AUSFB', 'credit', 'AU Xcite Ultra', 'au-xcite-ultra', NULL),
  ('AUSFB', 'credit', 'AU Xcite Ace', 'au-xcite-ace', NULL),
  ('AUSFB', 'credit', 'AU Purchase', 'au-purchase', 'https://www.au.bank.in/personal-banking/commercial-credit-cards/purchase-credit-card'),
  ('AUSFB', 'credit', 'AU Business Cashback', 'au-business-cashback', 'https://www.au.bank.in/personal-banking/commercial-credit-cards/business-cashback-credit-card'),
  ('AUSFB', 'credit', 'AU Corporate', 'au-corporate', 'https://www.au.bank.in/personal-banking/commercial-credit-cards/corporate-credit-card'),
  ('AUSFB', 'debit', 'AU Platinum Debit', 'au-platinum-debit', 'https://www.au.bank.in/personal-banking/debit-cards/platinum-debit-card'),
  ('AUSFB', 'debit', 'AU Royale Debit', 'au-royale-debit', 'https://www.au.bank.in/personal-banking/debit-cards/royale-debit-card'),
  ('AUSFB', 'debit', 'AU ivy Debit', 'au-ivy-debit', 'https://www.au.bank.in/premium-banking/debit-cards/au-ivy-debit-card'),
  ('AUSFB', 'debit', 'AU Eternity Debit', 'au-eternity-debit', 'https://www.au.bank.in/premium-banking/debit-cards/au-eternity-debit-card'),
  ('AUSFB', 'debit', 'AU Royale World Debit', 'au-royale-world-debit', 'https://www.au.bank.in/personal-banking/debit-cards/au-royale-world-debit-card'),
  ('AUSFB', 'debit', 'AU Royale Business Debit', 'au-royale-business-debit', 'https://www.au.bank.in/personal-banking/debit-cards/au-royale-business-debit-card'),
  ('AUSFB', 'debit', 'AU Gold Debit', 'au-gold-debit', 'https://www.au.bank.in/personal-banking/debit-cards/au-gold-debit-card'),
  ('AUSFB', 'debit', 'AU Visa Platinum Debit', 'au-visa-platinum-debit', 'https://www.au.bank.in/personal-banking/debit-cards/visa-platinum-debit-card'),
  ('AUSFB', 'debit', 'AU Platinum Business Debit', 'au-platinum-business-debit', 'https://www.au.bank.in/personal-banking/debit-cards/visa-business-platinum-debit-card'),
  ('AUSFB', 'debit', 'AU Visa Business Gold Debit', 'au-visa-business-gold-debit', 'https://www.au.bank.in/personal-banking/debit-cards/visa-business-gold-debit-card'),
  ('AUSFB', 'debit', 'AU RuPay Platinum Debit', 'au-rupay-platinum-debit', 'https://www.au.bank.in/personal-banking/debit-cards/rupay-platinum-debit-card'),
  ('AUSFB', 'debit', 'AU RuPay Classic Debit', 'au-rupay-classic-debit', 'https://www.au.bank.in/personal-banking/debit-cards/rupay-classic-debit-card'),
  ('AUSFB', 'debit', 'AU swipe&save Platinum Debit', 'au-swipe-and-save-platinum-debit', 'https://www.au.bank.in/personal-banking/debit-cards/au-swipe-and-save-debit-card'),
  ('DBS', 'credit', 'DBS Bank Vantage', 'dbs-bank-vantage', 'https://www.dbs.com/in/credit-cards/vantage.html'),
  ('DBS', 'credit', 'DBS Spark', 'dbs-spark', 'https://www.dbs.com/in/credit-cards/spark.html'),
  ('DBS', 'credit', 'DBS SuperCard', 'dbs-supercard', 'https://www.dbs.com/in/credit-cards/supercard.html'),
  ('DBS', 'debit', 'DBS digibank Debit', 'dbs-digibank-debit', NULL),
  ('DBS', 'debit', 'DBS Visa Debit', 'dbs-visa-debit', NULL),
  ('DBS', 'debit', 'DBS Treasures Debit', 'dbs-treasures-debit', NULL),
  ('CSB', 'credit', 'Edge+ CSB Bank RuPay Credit Card (Jupiter)', 'edge-plus-csb-bank-rupay-credit-card', 'https://www.csb.bank.in/csb-bank-edge-credit-card'),
  ('CSB', 'credit', 'Edge CSB Bank RuPay Credit Card (Jupiter)', 'edge-csb-bank-rupay-credit-card', 'https://jupiter.money/edge-csb-rupay-credit-card'),
  ('CSB', 'credit', 'CSB OneCard', 'csb-onecard', NULL),
  ('CSB', 'debit', 'CSB Classic Debit', 'csb-classic-debit', NULL),
  ('CSB', 'debit', 'CSB Platinum Debit', 'csb-platinum-debit', NULL),
  ('CSB', 'debit', 'CSB RuPay Debit', 'csb-rupay-debit', NULL)
) AS v(code, card_type, name, slug, url)
JOIN "banks" b ON b."code" = v.code
ON CONFLICT ("bank_id", "card_type", "slug") DO UPDATE
  SET "product_url" = EXCLUDED."product_url"
  WHERE EXCLUDED."product_url" IS NOT NULL;--> statement-breakpoint

-- Dropped only where nobody selected one. A product a real member picked
-- stays, vague name and all, rather than breaking their card.
DELETE FROM "card_products" p
USING "banks" b, (VALUES
  ('AUSFB', 'debit', 'au-signature-debit'),
  ('IDBI', 'debit', 'idbi-platinum-debit'),
  ('IDBI', 'debit', 'idbi-rupay-debit'),
  ('IDBI', 'debit', 'idbi-gold-debit'),
  ('DBS', 'credit', 'dbs-bank-platinum'),
  ('DBS', 'credit', 'dbs-digibank-rewards'),
  ('FEDERAL', 'debit', 'federal-bank-platinum-debit'),
  ('FEDERAL', 'debit', 'federal-bank-signature-debit')
) AS v(code, card_type, slug)
WHERE b."code" = v.code
  AND p."bank_id" = b."id"
  AND p."card_type" = v.card_type::"card_type"
  AND p."slug" = v.slug
  AND NOT EXISTS (SELECT 1 FROM "cards" c WHERE c."product_id" = p."id");
