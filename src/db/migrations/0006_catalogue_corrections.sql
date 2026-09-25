-- Catalogue corrections.
--
-- The seed list in 0004 was compiled from recall and had two faults, both
-- found when a user pointed at cards that were missing:
--
--   1. Real, current products were absent -- notably the Jupiter co-brands
--      (issued by CSB and Federal, not by Jupiter) and most of SBI's debit
--      range, including the IOCL co-brand.
--   2. Two CSB credit cards listed in 0004 do not exist. They were invented.
--      CSB issues Edge, Edge+ and OneCard.
--
-- Everything below was checked against the issuers' own pages rather than
-- recalled again. The catalogue will still be incomplete -- that is what the
-- Other option is for -- but it should not be WRONG.

INSERT INTO card_products (bank_id, card_type, name, slug, is_verified)
SELECT b.id, v.card_type::card_type, v.name, v.slug, true
FROM (VALUES
  ('CSB', 'credit', 'Edge+ CSB Bank RuPay Credit Card (Jupiter)', 'edge-plus-csb-bank-rupay-credit-card'),
  ('CSB', 'credit', 'Edge CSB Bank RuPay Credit Card (Jupiter)', 'edge-csb-bank-rupay-credit-card'),
  ('CSB', 'credit', 'CSB OneCard', 'csb-onecard'),
  ('FEDERAL', 'credit', 'Edge Federal Bank VISA Credit Card (Jupiter)', 'edge-federal-bank-visa-credit-card'),
  ('SBI', 'debit', 'SBI IOCL Co-Branded Contactless RuPay Debit Card', 'sbi-iocl-co-branded-contactless-rupay-debit-card'),
  ('SBI', 'debit', 'SBI HPCL Co-Branded Debit Card', 'sbi-hpcl-co-branded-debit-card'),
  ('SBI', 'debit', 'SBI Visa Infinite Debit Card', 'sbi-visa-infinite-debit-card'),
  ('SBI', 'debit', 'SBI Mastercard World Debit Card', 'sbi-mastercard-world-debit-card'),
  ('SBI', 'debit', 'SBI Pragati Platinum Debit Card', 'sbi-pragati-platinum-debit-card'),
  ('SBI', 'debit', 'SBI Nari Shakti Platinum Debit Card', 'sbi-nari-shakti-platinum-debit-card'),
  ('SBI', 'debit', 'SBI My Card International Debit Card', 'sbi-my-card-international-debit-card'),
  ('SBI', 'debit', 'SBI One Touch Debit Card', 'sbi-one-touch-debit-card'),
  ('SBI', 'debit', 'SBI Virtual Debit Card', 'sbi-virtual-debit-card')
) AS v(code, card_type, name, slug)
JOIN banks b ON b.code = v.code
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- Remove the invented entries, but only if nobody selected one. A product a
-- real user picked stays, wrong name and all, rather than breaking their card.
DELETE FROM card_products p
USING banks b, (VALUES
  ('CSB', 'credit', 'csb-bank-rupay-credit-card'),
  ('CSB', 'credit', 'csb-bank-yuva-credit-card')
) AS v(code, card_type, slug)
WHERE b.code = v.code
  AND p.bank_id = b.id
  AND p.card_type = v.card_type::card_type
  AND p.slug = v.slug
  AND NOT EXISTS (SELECT 1 FROM cards c WHERE c.product_id = p.id);
