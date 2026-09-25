/**
 * Generates the product-merge migration.
 *
 * Kept as a script rather than hand-written SQL so the slugs come from the
 * same productSlug() the application uses. A slug typed by hand that differs
 * by one character silently matches nothing, and the migration would appear
 * to succeed while doing nothing at all.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { productSlug } from '../src/server/modules/cards/product-slug'

/**
 * Merge batches, one per migration.
 *
 * Kept as history rather than edited in place: a migration that has run is
 * a fact, and regenerating an applied file to say something different would
 * make the journal lie about what a database contains.
 *
 * Batch 0007 held only mappings that were beyond doubt. Batch 0008 holds the
 * ones that needed a human to choose between two real cards — confirmed by
 * the card owner, not guessed.
 */
/**
 * `to` is the target's DISPLAY name; `toSlug` overrides the slug derived
 * from it.
 *
 * Needed because a display name and its slug can legitimately diverge. The
 * Jupiter co-brands are stored as "Edge+ CSB Bank RuPay Credit Card
 * (Jupiter)" with the slug `edge-plus-csb-bank-rupay-credit-card` — the
 * suffix is there for humans searching, while the slug stays the card's
 * canonical identity so "Other" entries of the official name still collapse
 * onto it. Deriving the slug from the name here produced
 * `...-credit-card-jupiter`, matched nothing, and the merge silently did
 * nothing at all.
 */
type Merge = [
  bank: string,
  cardType: 'credit' | 'debit',
  from: string,
  to: string,
  toSlug?: string,
]

const BATCHES: Array<{ file: string; header: string; merges: Merge[] }> = [
  {
    file: '0007_merge_user_products',
    header: `-- Merge user-created products into their real catalogue entries.
--
-- Cards added before the catalogue existed kept their old nicknames as
-- unverified products, and the "Other" option produced more. Each of the
-- names below refers to a card that IS in the catalogue, so a friend
-- searching the real name would not match them -- which defeats the point
-- of having a catalogue.
--
-- Only unambiguous mappings are here. Anything with two plausible targets
-- waits for 0008.
--
-- Cards are REPOINTED, never deleted. The card survives; only the name it
-- refers to is corrected.`,
    merges: [
      ['AXIS', 'credit', 'Flipkart Axis', 'Flipkart Axis Bank'],
      ['AXIS', 'credit', 'yash airtel axis', 'Airtel Axis Bank'],
      ['HDFC', 'credit', 'FREEDOM', 'HDFC Freedom'],
      ['HDFC', 'credit', 'Indian Oil Card', 'IndianOil HDFC'],
      ['HDFC', 'debit', 'MIllenia', 'HDFC Millennia Debit'],
      ['HDFC', 'debit', 'Millennia', 'HDFC Millennia Debit'],
      ['IDFC', 'credit', 'yash idfc first wow', 'IDFC FIRST WOW'],
      ['SBI', 'debit', 'yash sbi iocl', 'SBI IOCL Co-Branded Contactless RuPay Debit Card'],
    ],
  },
  {
    file: '0008_merge_confirmed_products',
    header: `-- The merges that needed a human to choose.
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
-- Cards are REPOINTED, never deleted, exactly as in 0007.`,
    merges: [
      ['HDFC', 'credit', 'Tata Neu', 'Tata Neu Plus HDFC'],
      ['SBI', 'credit', 'BPCL', 'BPCL SBI Card'],
      [
        'CSB',
        'credit',
        'yash jupiter csb',
        'Edge+ CSB Bank RuPay Credit Card (Jupiter)',
        // Stored slug omits the "(Jupiter)" suffix — see the Merge type.
        'edge-plus-csb-bank-rupay-credit-card',
      ],
      ['CANARA', 'debit', 'yash canara dc', 'Canara RuPay Debit'],
      ['HDFC', 'debit', 'Yash Hdfc Debit', 'HDFC Millennia Debit'],
    ],
  },
]

const escape = (value: string): string => value.replace(/'/g, "''")

for (const batch of BATCHES) {
  const rows = batch.merges
    .map(
      ([bank, cardType, from, to, toSlug]) =>
        `  ('${escape(bank)}', '${cardType}', '${escape(productSlug(from))}', '${escape(toSlug ?? productSlug(to))}')`,
    )
    .join(',\n')

  const sql = `${batch.header}

-- 1. Move every card from the source product to the target.
UPDATE "cards" c
SET "product_id" = target."id"
FROM (VALUES
${rows}
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
${rows}
) AS v(code, card_type, from_slug, to_slug)
JOIN "banks" b ON b."code" = v.code
WHERE p."bank_id" = b."id"
  AND p."card_type" = v.card_type::"card_type"
  AND p."slug" = v.from_slug
  AND NOT p."is_verified"
  AND NOT EXISTS (SELECT 1 FROM "cards" c WHERE c."product_id" = p."id");
`

  const path = `src/db/migrations/${batch.file}.sql`

  // Never rewrite a migration that exists. Once a file has run somewhere,
  // it is a record of what that database did; regenerating it — even to
  // reword a comment — makes the file disagree with reality.
  if (existsSync(path)) {
    console.log(`${batch.file}: already written, left untouched`)
    continue
  }

  writeFileSync(path, sql)
  console.log(`${batch.file}: ${batch.merges.length} merges written`)
}
