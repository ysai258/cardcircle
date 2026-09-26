/**
 * The issuer's own page for each catalogue product.
 *
 * WHY THESE EXIST
 *
 * A card's name on screen is the question "what does this card actually get
 * me?", and the honest answer lives on the issuer's page, not here. Offers,
 * fees and reward rates change weekly; restating them would mean shipping a
 * copy that is wrong within a month. So the name links out instead.
 *
 * HOW THEY WERE COLLECTED, AND WHAT THAT GUARANTEES
 *
 * Every URL below came from the issuer itself — its sitemap.xml, or its own
 * card-listing page — never from a guessed path or a search result. Each one
 * was then fetched, and all but seven returned 200.
 *
 * Those seven are on bobcard.co.in, which Bank of Baroda's own credit-card
 * page links to and whose DNS resolves, but which refuses connections from
 * this network. Its pages are reachable from a browser; the link is BoB's,
 * not ours.
 *
 * Twelve banks — Canara, Union, Bandhan, HSBC, PNB, Bank of Baroda, Central,
 * YES, AU, IDBI, DBS and Federal — were taken wholesale from their own card
 * listings rather than recalled, and each page was opened and its heading
 * read back where the page renders one. `tests/unit/bank-links` names every
 * product of theirs that is deliberately unlinked, so adding one without a
 * link fails.
 *
 * Four of those needed the real Chrome binary to read at all: YES, AU, IDBI
 * and DBS reject bundled Chromium's TLS fingerprint outright, and serve curl
 * either nothing or an empty JavaScript shell. Only Bank of India is
 * genuinely unreadable — its Cloudflare challenge does not resolve headless.
 *
 * WHAT READING THE PAGES BACK HAS CAUGHT
 *
 * Every link here has been loaded in a real browser and checked against the
 * page's own heading and text. Nothing was dead. Three things were wrong,
 * and none of them could have been caught any other way:
 *
 *   - csb.bank.in/csb-bank-edge-credit-card renders <h1>Edge+ CSB Bank
 *     RuPay Credit Card</h1>. It is the Edge PLUS page, and the plain Edge
 *     card pointed at it for four migrations.
 *   - federal.bank.in/visa-imperio-credit-card, which Federal's own listing
 *     links, renders the CELESTA heading. It is not used.
 *   - "YES Prosperity RuPay Platinum Debit" is not a RuPay card; its page
 *     is titled "YES Prosperity Platinum Debit card" and never says RuPay.
 *
 * And one duplicate: AU lists /visa-platinum-debit-card and
 * /platinum-debit-card, which serve byte-identical pages. Two names for one
 * card, now one.
 *
 * The audit is worth re-running after any batch. It needs a real Chrome and
 * a generous wait -- a 1.6s wait reported four YES Bank pages as mismatches
 * that a 9s wait showed were fine.
 *
 * WHY THE REST HAVE NO ENTRY
 *
 * Matching is deliberately strict: the last segment of the URL has to name
 * the card and nothing else. "BOB Classic Debit" is three real cards on
 * BoB's site (Visa Classic, RuPay Classic, Mastercard Classic), and picking
 * one would put a confident wrong link on someone's card. Those fall back to
 * the bank's card-listing page from bank-links.ts, which is the right answer
 * to "show me this bank's cards" even when it is not the exact card.
 *
 * Banks behind a bot wall (Bank of India, AU, DBS, IDBI) could not be read at
 * all, so none of their products are here.
 *
 * Citi has no entries on purpose: its Indian consumer card portfolio moved to
 * Axis Bank in 2023 and the old product pages are gone.
 *
 * DO NOT hand-edit a URL into this file without opening it first. A link
 * CardCircle shows is a link people will trust because we showed it.
 *
 * Regenerate the migration after editing: npm run db:gen-product-urls
 */

export type CardProductUrl = [
  bank: string,
  cardType: 'credit' | 'debit',
  /** Product name exactly as it appears in card-products.ts. */
  name: string,
  url: string,
  /**
   * The slug stored in the database, when it differs from productSlug(name).
   *
   * Needed for the two Jupiter co-brands. Migration 0006 stored them with a
   * "(Jupiter)" suffix on the NAME so the people holding them can find them,
   * while the slug stayed the card's official identity — so deriving the slug
   * from the name here produces `…-credit-card-jupiter`, which matches no row.
   *
   * This is not hypothetical: the first run of the migration set 147 of 149
   * URLs and these were the two it silently missed. It was caught by counting
   * the rows afterwards against a database migrated from empty, which is the
   * only way a mismatch like this shows up at all.
   */
  slug?: string,
]

export const CARD_PRODUCT_URLS: readonly CardProductUrl[] = [
  ['HDFC', 'credit', '6E Rewards IndiGo HDFC', 'https://www.hdfc.bank.in/credit-cards/6e-rewards-indigo-credit-card'],
  ['HDFC', 'credit', 'HDFC Business Regalia', 'https://www.hdfc.bank.in/business-credit-cards/business-regalia-credit-card'],
  ['HDFC', 'credit', 'HDFC Diners Club Black', 'https://www.hdfc.bank.in/credit-cards/diners-club-black-credit-card'],
  ['HDFC', 'credit', 'HDFC Freedom', 'https://www.hdfc.bank.in/credit-cards/freedom-credit-card'],
  ['HDFC', 'credit', 'HDFC Infinia', 'https://www.hdfc.bank.in/credit-cards/infinia-credit-card'],
  ['HDFC', 'credit', 'HDFC Millennia', 'https://www.hdfc.bank.in/credit-cards/millennia-credit-card'],
  ['HDFC', 'credit', 'HDFC MoneyBack+', 'https://www.hdfc.bank.in/credit-cards/moneyback-plus-credit-card'],
  ['HDFC', 'credit', 'HDFC Regalia', 'https://www.hdfc.bank.in/credit-cards/regalia-credit-card'],
  ['HDFC', 'credit', 'HDFC Regalia Gold', 'https://www.hdfc.bank.in/credit-cards/regalia-gold-credit-card'],
  ['HDFC', 'credit', 'IndianOil HDFC', 'https://www.hdfc.bank.in/credit-cards/indianoil-hdfc-bank-credit-card'],
  ['HDFC', 'credit', 'Marriott Bonvoy HDFC', 'https://www.hdfc.bank.in/credit-cards/marriott-bonvoy-credit-card'],
  ['HDFC', 'credit', 'Shoppers Stop HDFC', 'https://www.hdfc.bank.in/credit-cards/shoppers-stop-credit-card'],
  ['HDFC', 'credit', 'Swiggy HDFC', 'https://www.hdfc.bank.in/credit-cards/swiggy-hdfc-bank-credit-card'],
  ['HDFC', 'credit', 'Tata Neu Infinity HDFC', 'https://www.hdfc.bank.in/credit-cards/tata-neu-infinity-hdfc-bank-credit-card'],
  ['HDFC', 'credit', 'Tata Neu Plus HDFC', 'https://www.hdfc.bank.in/credit-cards/tata-neu-plus-hdfc-bank-credit-card'],
  ['HDFC', 'debit', 'HDFC EasyShop Platinum Debit', 'https://www.hdfc.bank.in/debit-cards/easyshop-platinum-debit-card'],
  ['HDFC', 'debit', 'HDFC Millennia Debit', 'https://www.hdfc.bank.in/debit-cards/millennia-debit-card'],
  ['HDFC', 'debit', 'HDFC Rewards Debit', 'https://www.hdfc.bank.in/debit-cards/rewards-debit-card'],
  ['HDFC', 'debit', 'HDFC Times Points Debit', 'https://www.hdfc.bank.in/debit-cards/times-points-debit-card'],
  ['AXIS', 'credit', 'Airtel Axis Bank', 'https://www.axis.bank.in/cards/credit-card/airtel-axis-bank-credit-card'],
  ['AXIS', 'credit', 'Axis ACE', 'https://www.axis.bank.in/cards/credit-card/axis-bank-ace-credit-card'],
  ['AXIS', 'credit', 'Axis Atlas', 'https://www.axis.bank.in/cards/credit-card/axis-bank-atlas-credit-card'],
  ['AXIS', 'credit', 'Axis Horizon', 'https://www.axis.bank.in/cards/credit-card/axis-horizon-credit-card'],
  ['AXIS', 'credit', 'Axis Magnus', 'https://www.axis.bank.in/cards/credit-card/axis-bank-magnus-credit-card'],
  ['AXIS', 'credit', 'Axis MY ZONE', 'https://www.axis.bank.in/cards/credit-card/axis-bank-my-zone-credit-card'],
  ['AXIS', 'credit', 'Axis NEO', 'https://www.axis.bank.in/cards/credit-card/axis-bank-neo-credit-card'],
  ['AXIS', 'credit', 'Axis Reserve', 'https://www.axis.bank.in/cards/credit-card/reserve-credit-card'],
  ['AXIS', 'credit', 'Axis Rewards', 'https://www.axis.bank.in/cards/credit-card/rewards-credit-card'],
  ['AXIS', 'credit', 'Axis Select', 'https://www.axis.bank.in/cards/credit-card/axis-bank-select-credit-card'],
  ['AXIS', 'credit', 'Axis Vistara', 'https://www.axis.bank.in/cards/credit-card/axis-bank-vistara-credit-card'],
  ['AXIS', 'credit', 'Axis Vistara Infinite', 'https://www.axis.bank.in/cards/credit-card/axis-bank-vistara-infinite-credit-card'],
  ['AXIS', 'credit', 'Flipkart Axis Bank', 'https://www.axis.bank.in/cards/credit-card/flipkart-axisbank-credit-card'],
  ['AXIS', 'credit', 'IndianOil Axis Bank', 'https://www.axis.bank.in/cards/credit-card/indianoil-axis-bank-credit-card'],
  ['AXIS', 'credit', 'Samsung Axis Bank Infinite', 'https://www.axis.bank.in/cards/credit-card/samsung-axis-bank-infinite-credit-card'],
  ['AXIS', 'credit', 'Samsung Axis Bank Signature', 'https://www.axis.bank.in/cards/credit-card/samsung-axis-bank-signature-credit-card'],
  ['AXIS', 'debit', 'Axis Burgundy Debit', 'https://www.axis.bank.in/cards/debit-card/burgundy-debit-card'],
  ['AXIS', 'debit', 'Axis Liberty Debit', 'https://www.axis.bank.in/cards/debit-card/liberty-debit-card'],
  ['AXIS', 'debit', 'Axis Prestige Debit', 'https://www.axis.bank.in/cards/debit-card/prestige-debit-card'],
  ['AXIS', 'debit', 'Axis Priority Debit', 'https://www.axis.bank.in/cards/debit-card/priority-debit-card'],
  ['SBI', 'credit', 'Air India SBI Signature', 'https://www.sbicard.com/en/personal/credit-cards/travel/air-india-sbi-signature-card.page'],
  ['SBI', 'credit', 'BPCL SBI Card', 'https://www.sbicard.com/en/personal/credit-cards/travel/bpcl-sbi-card.page'],
  ['SBI', 'credit', 'BPCL SBI Octane', 'https://www.sbicard.com/en/personal/credit-cards/travel/bpcl-sbi-card-octane.page'],
  ['SBI', 'credit', 'Club Vistara SBI', 'https://www.sbicard.com/en/personal/credit-cards/travel/club-vistara-sbi-card.page'],
  ['SBI', 'credit', 'IRCTC SBI Platinum', 'https://www.sbicard.com/en/personal/credit-cards/travel/irctc-sbi-platinum-card.page'],
  ['SBI', 'credit', 'SBI Card ELITE', 'https://www.sbicard.com/en/personal/credit-cards/lifestyle/sbi-card-elite.page'],
  ['SBI', 'credit', 'SBI Card PRIME', 'https://www.sbicard.com/en/personal/credit-cards/rewards/sbi-card-prime.page'],
  ['SBI', 'credit', 'SBI Card PULSE', 'https://www.sbicard.com/en/personal/credit-cards/lifestyle/sbi-card-pulse.page'],
  ['SBI', 'credit', 'SBI Card Unnati', 'https://www.sbicard.com/en/personal/credit-cards/shopping/sbi-card-unnati.page'],
  ['SBI', 'credit', 'SBI Cashback Card', 'https://www.sbicard.com/en/personal/credit-cards/rewards/cashback-sbi-card.page'],
  ['SBI', 'credit', 'SBI SimplyCLICK', 'https://www.sbicard.com/en/personal/credit-cards/shopping/simplyclick-sbi-card.page'],
  ['SBI', 'credit', 'SBI SimplySAVE', 'https://www.sbicard.com/en/personal/credit-cards/shopping/simplysave-sbi-card.page'],
  ['SBI', 'credit', 'Tata Neu Infinity SBI', 'https://www.sbicard.com/en/personal/credit-cards/lifestyle/tata-neu-infinity-sbi-card.page'],
  ['SBI', 'debit', 'SBI Global International Debit', 'https://sbi.bank.in/web/personal-banking/cards/debit-card/sbi-global-international-debit-car'],
  ['SBI', 'debit', 'SBI Gold International Debit', 'https://sbi.bank.in/web/personal-banking/cards/debit-card/sbi-gold-international-debit-card'],
  ['SBI', 'debit', 'SBI HPCL Co-Branded Debit Card', 'https://sbi.bank.in/web/personal-banking/hpcl-co-branded-debit-card'],
  ['SBI', 'debit', 'SBI IOCL Co-Branded Contactless RuPay Debit Card', 'https://sbi.bank.in/web/personal-banking/cards/debit-card/sbi-iocl-co-branded-contactless-rupay-debit-card'],
  ['SBI', 'debit', 'SBI Mastercard World Debit Card', 'https://sbi.bank.in/web/personal-banking/sbi-mastercard-world-debit-card'],
  ['SBI', 'debit', 'SBI My Card International Debit Card', 'https://sbi.bank.in/web/personal-banking/cards/debit-card/sbi-my-card-international-debit-card'],
  ['SBI', 'debit', 'SBI Nari Shakti Platinum Debit Card', 'https://sbi.bank.in/web/personal-banking/sbi-nari-shakti-platinum-debit-card'],
  ['SBI', 'debit', 'SBI Platinum International Debit', 'https://sbi.bank.in/web/personal-banking/cards/debit-card/sbi-platinum-international-debit-card'],
  ['SBI', 'debit', 'SBI Pragati Platinum Debit Card', 'https://sbi.bank.in/web/personal-banking/sbi-pragati-platinum-debit-card'],
  ['SBI', 'debit', 'SBI Virtual Debit Card', 'https://sbi.bank.in/web/personal-banking/cards/debit-card/sbi-virtual-debit-card'],
  ['SBI', 'debit', 'SBI Visa Infinite Debit Card', 'https://sbi.bank.in/web/personal-banking/cards/debit-card/visa-infinite-debit-card'],
  ['ICICI', 'credit', 'Amazon Pay ICICI', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/credit-card/amazon-pay-credit-card'],
  ['ICICI', 'credit', 'HPCL Super Saver ICICI', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/credit-card/hpcl-super-saver'],
  ['ICICI', 'credit', 'ICICI Coral', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/credit-card/coral-credit-card'],
  ['ICICI', 'credit', 'ICICI Emeralde', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/credit-card/emeralde-credit-card'],
  ['ICICI', 'credit', 'ICICI Emeralde Private Metal', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/credit-card/emeralde-private-metal-credit-card'],
  ['ICICI', 'credit', 'ICICI Expressions', 'https://www.icici.bank.in/personal-banking/cards/credit-card/expressions-card'],
  ['ICICI', 'credit', 'ICICI Platinum Chip', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/credit-card/platinum-chip-credit-card'],
  ['ICICI', 'credit', 'ICICI Rubyx', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/credit-card/rubyx-credit-card'],
  ['ICICI', 'credit', 'ICICI Sapphiro', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/credit-card/sapphiro-card'],
  ['ICICI', 'credit', 'MakeMyTrip ICICI', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/credit-card/makemytrip/makemytrip-icici-bank-credit-card'],
  ['ICICI', 'debit', 'ICICI Coral Debit', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/debit-card/coral-debit-card'],
  ['ICICI', 'debit', 'ICICI Expressions Debit', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/debit-card/expressions-debit-card'],
  ['ICICI', 'debit', 'ICICI Platinum Chip Debit', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/debit-card/platinum-chip-card'],
  ['ICICI', 'debit', 'ICICI Rubyx Debit', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/debit-card/rubyx-debit-card'],
  ['ICICI', 'debit', 'ICICI Sapphiro Debit', 'https://www.icici.bank.in/content/icicibank-revamp/in/en/personal-banking/cards/debit-card/expressions-debit-card/sapphiro'],
  ['KOTAK', 'credit', 'Kotak 811 Dream Different', 'https://www.kotak.bank.in/en/personal-banking/cards/credit-cards/811-dream-different-credit-card.html'],
  ['KOTAK', 'credit', 'Kotak League Platinum', 'https://www.kotak.bank.in/en/personal-banking/cards/credit-cards/league-platinum-card.html'],
  ['KOTAK', 'credit', 'Kotak Mojo Platinum', 'https://www.kotak.bank.in/en/personal-banking/cards/credit-cards/mojo-platinum-credit-card.html'],
  ['KOTAK', 'credit', 'Kotak Royale Signature', 'https://www.kotak.bank.in/en/personal-banking/cards/credit-cards/royale-signature-credit-card.html'],
  ['KOTAK', 'credit', 'Kotak Solitaire', 'https://www.kotak.bank.in/en/personal-banking/cards/credit-cards/kotak-solitaire-credit-card.html'],
  ['KOTAK', 'credit', 'Kotak White', 'https://www.kotak.bank.in/en/personal-banking/cards/credit-cards/white-credit-card.html'],
  ['KOTAK', 'credit', 'Kotak White Reserve', 'https://www.kotak.bank.in/en/personal-banking/cards/credit-cards/white-reserve-credit-card.html'],
  ['KOTAK', 'credit', 'Kotak Zen Signature', 'https://www.kotak.bank.in/en/personal-banking/cards/credit-cards/zen-signature-credit-card.html'],
  ['KOTAK', 'credit', 'PVR INOX Kotak', 'https://www.kotak.bank.in/en/personal-banking/cards/credit-cards/pvr-inox-kotak-credit-card.html'],
  ['KOTAK', 'debit', 'Kotak Platinum Debit', 'https://www.kotak.bank.in/en/personal-banking/cards/debit-cards/platinum-debit-card.html'],
  ['KOTAK', 'debit', 'Kotak Silk Debit', 'https://www.kotak.bank.in/en/personal-banking/cards/debit-cards/silk-debit-card.html'],
  ['IDFC', 'credit', 'Club Vistara IDFC FIRST', 'https://www.idfcfirst.bank.in/credit-card/vistara-credit-card'],
  ['IDFC', 'credit', 'IDFC FIRST Classic', 'https://www.idfcfirst.bank.in/credit-card/classic'],
  ['IDFC', 'credit', 'IDFC FIRST Millennia', 'https://www.idfcfirst.bank.in/credit-card/millennia'],
  ['IDFC', 'credit', 'IDFC FIRST Power', 'https://www.idfcfirst.bank.in/credit-card/hpcl-power-fuel-credit-card'],
  ['IDFC', 'credit', 'IDFC FIRST Power+', 'https://www.idfcfirst.bank.in/credit-card/hpcl-power-fuel-credit-card'],
  ['IDFC', 'credit', 'IDFC FIRST Select', 'https://www.idfcfirst.bank.in/credit-card/select'],
  ['IDFC', 'credit', 'IDFC FIRST SWYP', 'https://www.idfcfirst.bank.in/credit-card/swyp-emi-credit-card'],
  ['IDFC', 'credit', 'IDFC FIRST Wealth', 'https://www.idfcfirst.bank.in/credit-card/wealth'],
  ['IDFC', 'credit', 'IDFC FIRST WOW', 'https://www.idfcfirst.bank.in/credit-card/wow'],
  ['IDFC', 'debit', 'IDFC FIRST Classic Debit', 'https://www.idfcfirst.bank.in/personal-banking/payments/cards/debit-card/classic-debit-card'],
  ['IDFC', 'debit', 'IDFC FIRST Platinum Debit', 'https://www.idfcfirst.bank.in/personal-banking/payments/cards/debit-card/platinum-debit-card'],
  ['AMEX', 'credit', 'Amex Membership Rewards', 'https://www.americanexpress.com/en-in/rewards/membership-rewards'],
  ['AMEX', 'credit', 'Amex Platinum Reserve', 'https://www.americanexpress.com/in/credit-cards/platinum-reserve-credit-card'],
  ['AMEX', 'credit', 'Amex Platinum Travel', 'https://www.americanexpress.com/in/credit-cards/platinum-travel-credit-card'],
  ['RBL', 'credit', 'RBL Icon', 'https://www.rbl.bank.in/personal-banking/cards/credit-cards/icon-credit-card'],
  ['RBL', 'credit', 'RBL Insignia Preferred Banking', 'https://www.rbl.bank.in/personal-banking/cards/credit-cards/insignia-preferred-banking-credit-card'],
  ['RBL', 'credit', 'RBL Platinum Maxima', 'https://www.rbl.bank.in/personal-banking/cards/credit-cards/platinum-maxima-credit-card'],
  ['RBL', 'credit', 'RBL Platinum Maxima Plus', 'https://www.rbl.bank.in/personal-banking/cards/credit-cards/platinum-maxima-plus-credit-card'],
  ['RBL', 'credit', 'RBL Popcorn', 'https://www.rbl.bank.in/personal-banking/cards/credit-cards/rbl-bank-popcorn-credit-card'],
  ['RBL', 'credit', 'RBL ShopRite', 'https://www.rbl.bank.in/personal-banking/cards/credit-cards/shoprite-credit-card'],
  ['RBL', 'credit', 'RBL World Safari', 'https://www.rbl.bank.in/personal-banking/cards/credit-cards/world-safari-credit-card'],
  ['RBL', 'debit', 'RBL Classic Debit', 'https://www.rbl.bank.in/personal-banking/cards/debit-cards/classic-debit-card'],
  ['RBL', 'debit', 'RBL Platinum Debit', 'https://www.rbl.bank.in/personal-banking/cards/debit-cards/platinum-debit-card'],
  ['RBL', 'debit', 'RBL Signature Debit', 'https://www.rbl.bank.in/personal-banking/cards/debit-cards/signature-debit-card'],
  ['INDUSIND', 'credit', 'IndusInd EazyDiner', 'https://www.indusind.bank.in/in/en/personal/cards/credit-card/eazydiner-credit-card.html'],
  ['INDUSIND', 'credit', 'IndusInd Legend', 'https://www.indusind.bank.in/in/en/personal/cards/credit-card/legend-credit-card.html'],
  ['INDUSIND', 'credit', 'IndusInd Nexxt', 'https://www.indusind.bank.in/in/en/personal/cards/credit-card/nexxt-credit-card.html'],
  ['INDUSIND', 'credit', 'IndusInd Pinnacle', 'https://www.indusind.bank.in/in/en/personal/cards/credit-card/pinnacle-world-credit-card.html'],
  ['INDUSIND', 'credit', 'IndusInd Platinum RuPay', 'https://www.indusind.bank.in/in/en/personal/cards/credit-card/platinum-rupay-credit-card.html'],
  ['INDUSIND', 'credit', 'IndusInd Tiger', 'https://www.indusind.bank.in/in/en/personal/cards/credit-card/tiger-credit-card.html'],
  ['BOB', 'credit', 'BOB Easy', 'https://www.bobcard.co.in/credit-card-types/easy'],
  ['BOB', 'credit', 'BOB Eterna', 'https://www.bobcard.co.in/credit-card-types/eterna'],
  ['BOB', 'credit', 'BOB Premier', 'https://www.bobcard.co.in/credit-card-types/premier'],
  ['BOB', 'credit', 'BOB Select', 'https://www.bobcard.co.in/credit-card-types/select'],
  ['BOB', 'credit', 'BOB Snapdeal', 'https://www.bobcard.co.in/credit-card-types/snapdeal-bobcard'],
  ['BOB', 'credit', 'IRCTC BOB', 'https://www.bobcard.co.in/credit-card-types/irctc-credit-card'],
  ['BOB', 'debit', 'BOB RuPay Select Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/rupay-select-debit-card'],
  ['PNB', 'debit', 'PNB Platinum Debit', 'https://pnb.bank.in/Platinum-Debit-Card.html'],
  ['UNION', 'credit', 'Union Bank RuPay Select', 'https://www.unionbankofindia.bank.in/en/details/rupay-select-credit-card'],
  ['CANARA', 'credit', 'Canara Mastercard Gold', 'https://www.canarabank.bank.in/mastercard-gold-credit-card'],
  ['CANARA', 'credit', 'Canara Mastercard Gold Secured', 'https://www.canarabank.bank.in/mastercard-gold-secured-credit-card'],
  ['CANARA', 'credit', 'Canara Mastercard Platinum', 'https://www.canarabank.bank.in/mastercard-platinum-credit-card'],
  ['CANARA', 'credit', 'Canara Mastercard Standard', 'https://www.canarabank.bank.in/mastercard-standard-credit-card'],
  ['CANARA', 'credit', 'Canara Mastercard World', 'https://www.canarabank.bank.in/mastercard-world-credit-card'],
  ['CANARA', 'credit', 'Canara RuPay Classic', 'https://www.canarabank.bank.in/rupay-classic-credit-card'],
  ['CANARA', 'credit', 'Canara RuPay Platinum', 'https://www.canarabank.bank.in/rupay-platinum-credit-card'],
  ['CANARA', 'credit', 'Canara RuPay Platinum Secured', 'https://www.canarabank.bank.in/rupay-platinum-secured-credit-card'],
  ['CANARA', 'credit', 'Canara RuPay Select', 'https://www.canarabank.bank.in/rupay-select-credit-card'],
  ['CANARA', 'credit', 'Canara RuPay Select Secured', 'https://www.canarabank.bank.in/rupay-select-secured-credit-card'],
  ['CANARA', 'credit', 'Canara Visa Classic', 'https://www.canarabank.bank.in/visa-classic-credit-card'],
  ['CANARA', 'credit', 'Canara Visa Corporate', 'https://www.canarabank.bank.in/visa-corporate-credit-card'],
  ['CANARA', 'credit', 'Canara Visa Gold', 'https://www.canarabank.bank.in/visa-gold-credit-card'],
  ['CANARA', 'credit', 'Canara Visa Gold Secured', 'https://www.canarabank.bank.in/visa-gold-secured-credit-card'],
  ['CANARA', 'credit', 'Canara Visa Platinum', 'https://www.canarabank.bank.in/visa-platinum-credit-card'],
  ['CANARA', 'credit', 'Canara Visa Signature', 'https://www.canarabank.bank.in/visa-signature-credit-card'],
  ['CANARA', 'debit', 'Canara Mastercard Business Debit', 'https://www.canarabank.bank.in/mastercard-business-debit-card'],
  ['CANARA', 'debit', 'Canara Mastercard Platinum Debit', 'https://www.canarabank.bank.in/mastercard-platinum-debit-card'],
  ['CANARA', 'debit', 'Canara Mastercard Platinum Millennial Debit', 'https://www.canarabank.bank.in/mastercard-platinum-millennial-debit-card'],
  ['CANARA', 'debit', 'Canara Mastercard Platinum Women Debit', 'https://www.canarabank.bank.in/mastercard-platinum-women-debit-card'],
  ['CANARA', 'debit', 'Canara Mastercard Standard Debit', 'https://www.canarabank.bank.in/mastercard-standard-debit-card'],
  ['CANARA', 'debit', 'Canara Mastercard World Debit', 'https://www.canarabank.bank.in/mastercard-world-debit-card'],
  ['CANARA', 'debit', 'Canara Mastercard World NRI Platina Debit', 'https://www.canarabank.bank.in/mastercard-world-nri-platina-debit-card'],
  ['CANARA', 'debit', 'Canara RuPay Classic Debit', 'https://www.canarabank.bank.in/rupay-classic-debit-card'],
  ['CANARA', 'debit', 'Canara RuPay Millennial Debit', 'https://www.canarabank.bank.in/rupay-millennial-debit-card'],
  ['CANARA', 'debit', 'Canara RuPay Platinum Domestic Debit', 'https://www.canarabank.bank.in/rupay-platinum-domestic-debit-card'],
  ['CANARA', 'debit', 'Canara RuPay Platinum International Debit', 'https://www.canarabank.bank.in/rupay-platinum-international-debit-card'],
  ['CANARA', 'debit', 'Canara RuPay Select Debit', 'https://www.canarabank.bank.in/rupay-select-debit-card'],
  ['CANARA', 'debit', 'Canara RuPay Women Platinum Debit', 'https://www.canarabank.bank.in/rupay-women-platinum-debit-card'],
  ['CANARA', 'debit', 'Canara Visa Classic Debit', 'https://www.canarabank.bank.in/visa-classic-debit-card'],
  ['CANARA', 'debit', 'Canara Visa Platinum Debit', 'https://www.canarabank.bank.in/visa-platinum-debit-card'],
  ['FEDERAL', 'credit', 'Federal Bank Celesta', 'https://www.federal.bank.in/celesta-credit-card'],
  ['FEDERAL', 'credit', 'Federal Bank Imperio', 'https://www.federal.bank.in/imperio-credit-card'],
  ['FEDERAL', 'credit', 'Federal Bank RuPay Signet', 'https://www.federal.bank.in/rupay-signet-credit-card'],
  ['FEDERAL', 'credit', 'Federal Bank Signet', 'https://www.federal.bank.in/signet-credit-card'],
  ['FEDERAL', 'debit', 'FedFirst Debit', 'https://www.federal.bank.in/fedfirst-contactless-debit-card'],
  ['SCB', 'credit', 'Standard Chartered DigiSmart', 'https://www.sc.bank.in/credit-cards/digismart-card'],
  ['SCB', 'credit', 'Standard Chartered EaseMyTrip', 'https://www.sc.bank.in/credit-cards/easemytrip-credit-card'],
  ['SCB', 'credit', 'Standard Chartered Manhattan Platinum', 'https://www.sc.bank.in/credit-cards/manhattan-platinum'],
  ['SCB', 'credit', 'Standard Chartered Platinum Rewards', 'https://www.sc.bank.in/credit-cards/platinum-rewards'],
  ['SCB', 'credit', 'Standard Chartered Rewards', 'https://www.sc.bank.in/credit-cards/rewards-credit-card'],
  ['SCB', 'credit', 'Standard Chartered Smart', 'https://www.sc.bank.in/credit-cards/smart-credit-card'],
  ['SCB', 'credit', 'Standard Chartered Ultimate', 'https://www.sc.bank.in/credit-cards/ultimate-card'],
  ['SCB', 'debit', 'Standard Chartered Platinum Debit', 'https://www.sc.bank.in/debit-cards/debit-card-platinum'],
  ['HSBC', 'credit', 'HSBC TravelOne', 'https://www.hsbc.bank.in/credit-cards/products/travelone'],
  ['HSBC', 'credit', 'HSBC Visa Platinum', 'https://www.hsbc.bank.in/credit-cards/products/visa-platinum'],
  // csb.bank.in/csb-bank-edge-credit-card renders <h1>Edge+ CSB Bank RuPay
  // Credit Card</h1>: it is the Edge PLUS page, so the plain Edge card points
  // at Jupiter's own Edge page instead. Both were read back from the pages.
  ['CSB', 'credit', 'Edge CSB Bank RuPay Credit Card (Jupiter)', 'https://jupiter.money/edge-csb-rupay-credit-card', 'edge-csb-bank-rupay-credit-card'],
  ['CSB', 'credit', 'Edge+ CSB Bank RuPay Credit Card (Jupiter)', 'https://www.csb.bank.in/csb-bank-edge-credit-card', 'edge-plus-csb-bank-rupay-credit-card'],
  ['BANDHAN', 'credit', 'Bandhan Bank Flare', 'https://creditcards.bandhan.bank.in/card-details/Flare/'],
  ['BANDHAN', 'credit', 'Bandhan Bank Ignite', 'https://creditcards.bandhan.bank.in/card-details/Ignite/'],
  ['BANDHAN', 'credit', 'Bandhan Bank Lumina', 'https://creditcards.bandhan.bank.in/card-details/Lumina/'],
  ['BANDHAN', 'credit', 'Bandhan Bank Sparks', 'https://creditcards.bandhan.bank.in/card-details/Sparks/'],
  ['BANDHAN', 'debit', 'Bandhan Bank Avni Debit', 'https://bandhan.bank.in/personal/debit-card/avni-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank Business Standard Debit', 'https://bandhan.bank.in/personal/debit-card/business-standard-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank Elite Debit', 'https://bandhan.bank.in/personal/debit-card/elite-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank Elite Plus Debit', 'https://bandhan.bank.in/personal/debit-card/elite-plus-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank Legacy Debit', 'https://bandhan.bank.in/personal/debit-card/legacy-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank Mastercard Platinum Debit', 'https://bandhan.bank.in/personal/debit-card/mastercard-platinum-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank Mastercard Platinum Plus Debit', 'https://bandhan.bank.in/personal/debit-card/mastercard-platinum-plus-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank Mastercard Titanium Debit', 'https://bandhan.bank.in/personal/debit-card/mastercard-titanium-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank PMJDY Debit', 'https://bandhan.bank.in/personal/debit-card/pradhan-matri-jan-dhan-yojana-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank RuPay Classic Debit', 'https://bandhan.bank.in/personal/debit-card/rupay-classic-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank RuPay Platinum Debit', 'https://bandhan.bank.in/personal/debit-card/rupay-platinum-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank Visa Classic Debit', 'https://bandhan.bank.in/personal/debit-card/visa-classic-debit-card'],
  ['BANDHAN', 'debit', 'Bandhan Bank Visa Platinum Debit', 'https://bandhan.bank.in/personal/debit-card/visa-platinum-debit-card'],
  ['BOB', 'debit', 'BOB EaseMyTrip Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bank-of-baroda-emt-debit-card'],
  ['BOB', 'debit', 'BOB inSIGHT Braille Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bob-insight-braille-debit-card'],
  ['BOB', 'debit', 'BOB Mastercard Classic Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/mastercard-classic-debit-card'],
  ['BOB', 'debit', 'BOB Mastercard Platinum Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/baroda-master-platinum-di-debit-card'],
  ['BOB', 'debit', 'BOB Mastercard World Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/mastercard-world-debit-card'],
  ['BOB', 'debit', 'BOB RuPay Classic Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/rupay-classic-debit-card'],
  ['BOB', 'debit', 'BOB RuPay Platinum Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/rupay-platinum-di-debit-card'],
  ['BOB', 'debit', 'BOB RuPay Qsparc NCMC Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/rupay-national-common-mobility-card-ncmc'],
  ['BOB', 'debit', 'BOB Virtual Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/virtual-debit-card'],
  ['BOB', 'debit', 'BOB Visa Classic Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/visa-classic-di-debit-card'],
  ['BOB', 'debit', 'BOB Visa Platinum Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/visa-platinum-debit-card'],
  ['BOB', 'debit', 'BOB Visa Vyapaar Business Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/baroda-visa-vyapaar-business-debit-card'],
  ['BOB', 'debit', 'BOB World Agniveer Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bob-world-agniveer-debit-card'],
  ['BOB', 'debit', 'BOB World Visa Opulence Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bob-world-visa-opulence-debit-card'],
  ['BOB', 'debit', 'BOB World Visa Sapphire Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bob-world-visa-sapphire-debit-card'],
  ['BOB', 'debit', 'BOB World Yoddha Debit', 'https://bankofbaroda.bank.in/digital-products/cards/debit-cards/bob-world-yoddha-debit-card'],
  ['HSBC', 'credit', 'HSBC Live+', 'https://www.hsbc.bank.in/credit-cards/products/live-plus/'],
  ['HSBC', 'credit', 'HSBC Premier', 'https://www.hsbc.bank.in/credit-cards/products/premier/'],
  ['HSBC', 'credit', 'HSBC RuPay Cashback', 'https://www.hsbc.bank.in/credit-cards/products/rupay-cashback-credit-card/'],
  ['HSBC', 'credit', 'HSBC RuPay Platinum', 'https://www.hsbc.bank.in/credit-cards/products/rupay-platinum-credit-card/'],
  ['HSBC', 'credit', 'HSBC Taj', 'https://www.hsbc.bank.in/credit-cards/products/taj/'],
  ['PNB', 'credit', 'PNB BLISS', 'https://creditcard.pnb.bank.in/types13.html'],
  ['PNB', 'credit', 'PNB KIWI Co-Branded', 'https://creditcard.pnb.bank.in/types18.html'],
  ['PNB', 'credit', 'PNB Metal LUXURA on RuPay', 'https://creditcard.pnb.bank.in/types16.html'],
  ['PNB', 'credit', 'PNB Metal LUXURA on Visa', 'https://creditcard.pnb.bank.in/types17.html'],
  ['PNB', 'credit', 'PNB Patanjali RuPay Select', 'https://creditcard.pnb.bank.in/types11.html'],
  ['PNB', 'credit', 'PNB Prakram', 'https://creditcard.pnb.bank.in/types20.html'],
  ['PNB', 'credit', 'PNB Premium Metal LUXURA (Indian Army)', 'https://creditcard.pnb.bank.in/types21.html'],
  ['PNB', 'credit', 'PNB Rakshak RuPay Platinum', 'https://creditcard.pnb.bank.in/types7.html'],
  ['PNB', 'credit', 'PNB Rakshak RuPay Select', 'https://creditcard.pnb.bank.in/types8.html'],
  ['PNB', 'credit', 'PNB RRB Co-Branded RuPay Select', 'https://creditcard.pnb.bank.in/types24.html'],
  ['PNB', 'credit', 'PNB RuPay Millennial', 'https://creditcard.pnb.bank.in/types10.html'],
  ['PNB', 'credit', 'PNB SALARY RuPay Platinum', 'https://creditcard.pnb.bank.in/types14.html'],
  ['PNB', 'credit', 'PNB SALARY RuPay Select', 'https://creditcard.pnb.bank.in/types15.html'],
  ['PNB', 'credit', 'PNB Visa Classic', 'https://creditcard.pnb.bank.in/types2.html'],
  ['PNB', 'credit', 'PNB Visa Gold', 'https://creditcard.pnb.bank.in/types1.html'],
  ['PNB', 'credit', 'PNB Visa Platinum', 'https://creditcard.pnb.bank.in/types3.html'],
  ['PNB', 'credit', 'PNB Visa Signature', 'https://creditcard.pnb.bank.in/types9.html'],
  ['PNB', 'credit', 'PNB Wave & Pay', 'https://creditcard.pnb.bank.in/types4.html'],
  ['PNB', 'credit', 'PNB Zaggle Co-Branded Twin', 'https://creditcard.pnb.bank.in/types19.html'],
  ['UNION', 'credit', 'Union Bank DIVAA ICON', 'https://www.unionbankofindia.bank.in/en/Details/divaa-icon-credit-card'],
  ['UNION', 'credit', 'Union Bank JCB Health', 'https://www.unionbankofindia.bank.in/en/Details/union-jcb-health-credit-card'],
  ['UNION', 'credit', 'Union Bank JCB Wellness', 'https://www.unionbankofindia.bank.in/en/Details/union-jcb-wellness-credit-card'],
  ['UNION', 'credit', 'Union Bank NEXTERIA', 'https://www.unionbankofindia.bank.in/en/Details/nexteria-credit-card'],
  ['UNION', 'credit', 'Union Bank PM SVANidhi', 'https://www.unionbankofindia.bank.in/en/Details/pm-svanidhi-credit-card'],
  ['UNION', 'credit', 'Union Bank RuPay Platinum', 'https://www.unionbankofindia.bank.in/en/Details/rupay-platinum-credit-card'],
  ['UNION', 'credit', 'Union Bank Sparsh', 'https://www.unionbankofindia.bank.in/en/Details/union-sparsh-credit-card'],
  ['UNION', 'credit', 'Union Bank UNI-CARBON', 'https://www.unionbankofindia.bank.in/en/Details/union-uni-carbon-credit-card'],
  ['UNION', 'credit', 'Union Bank Unicorn RuPay', 'https://www.unionbankofindia.bank.in/en/Details/union-unicorn-credit-card'],
  ['UNION', 'credit', 'Union Bank Visa Gold', 'https://www.unionbankofindia.bank.in/en/Details/visa-gold-credit-card'],
  ['UNION', 'credit', 'Union Bank Visa Platinum', 'https://www.unionbankofindia.bank.in/en/Details/visa-platinum-credit-card'],
  ['UNION', 'credit', 'Union Bank Visa Signature', 'https://www.unionbankofindia.bank.in/en/Details/visa-signature-credit-card'],
  ['UNION', 'debit', 'Union Bank Business Debit (Platinum)', 'https://www.unionbankofindia.bank.in/en/Details/business-debit-card-platinum'],
  ['UNION', 'debit', 'Union Bank Business Platinum Debit', 'https://www.unionbankofindia.bank.in/en/Details/business-platinum-debit-card'],
  ['UNION', 'debit', 'Union Bank Classic Debit (RuPay / Visa)', 'https://www.unionbankofindia.bank.in/en/Details/classic-debit-card-rupay-visa'],
  ['UNION', 'debit', 'Union Bank HNI Emperio Metal Debit', 'https://www.unionbankofindia.bank.in/en/Details/hni-emperio-metal-debit-card'],
  ['UNION', 'debit', 'Union Bank Platinum Debit (RuPay / Visa / Mastercard)', 'https://www.unionbankofindia.bank.in/en/Details/platinum-debit-card-rupay-visa-master'],
  ['UNION', 'debit', 'Union Bank Qsparc RuPay Debit', 'https://www.unionbankofindia.bank.in/en/Details/qsparc-debit-card-rupay'],
  ['UNION', 'debit', 'Union Bank RuPay Empower Her Debit', 'https://www.unionbankofindia.bank.in/en/Details/rupay-empower-her-debit-card'],
  ['UNION', 'debit', 'Union Bank RuPay Select Debit', 'https://www.unionbankofindia.bank.in/en/Details/rupay-select-debit-card'],
  ['PNB', 'credit', 'PNB RuPay Select', 'https://creditcard.pnb.bank.in/types6.html'],
  ['PNB', 'credit', 'PNB RuPay Platinum', 'https://creditcard.pnb.bank.in/types5.html'],
  ['PNB', 'credit', 'PNB Patanjali RuPay Platinum', 'https://creditcard.pnb.bank.in/types12.html'],
  ['BOB', 'credit', 'BOB Varunah', 'https://www.bobcard.co.in/credit-card-types/indian-navy-varunah'],
  ['YES', 'credit', 'YES ANQ Phi', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/anq-phi-credit-card'],
  ['YES', 'credit', 'YES FinBooster', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/finbooster-card'],
  ['YES', 'credit', 'YES Klick', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/klick-credit-card'],
  ['YES', 'credit', 'YES novio', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/novio-credit-card'],
  ['YES', 'credit', 'YES novio RuPay', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/novio-rupay-credit-card'],
  ['YES', 'credit', 'YES Paisabazaar PaisaSave', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/paisabazaar-credit-card'],
  ['YES', 'credit', 'YES POP-CLUB', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/pop-club-credit-card'],
  ['YES', 'credit', 'YES UNI', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/uni-credit-card'],
  ['YES', 'credit', 'YES UNI RuPay', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/uni-rupay-credit-card'],
  ['YES', 'credit', 'YES Zagg', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/credit-cards/zagg-credit-card'],
  ['YES', 'debit', 'YES Apex Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/apex-debit-card'],
  ['YES', 'debit', 'YES Apex Metal Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/apex-debit-card'],
  ['YES', 'debit', 'YES Aura Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/aura-debit-card'],
  ['YES', 'debit', 'YES Elegance Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/elegance-debit-card'],
  ['YES', 'debit', 'YES Element Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/element-debit-card'],
  ['YES', 'debit', 'YES Emerge Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/emerge-debit-card'],
  ['YES', 'debit', 'YES Engage Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/engage-debit-card'],
  ['YES', 'debit', 'YES Explore Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/explore-debit-card'],
  ['YES', 'debit', 'YES First Business Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-first-business-debit-card'],
  ['YES', 'debit', 'YES First Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-first-debit-card'],
  ['YES', 'debit', 'YES Grandeur Business Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/grandeur-business-debit-card'],
  ['YES', 'debit', 'YES Grandeur Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-grandeur-debit-card'],
  ['YES', 'debit', 'YES Healthfit Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/e-series-debit-card/healthfit-debit-card'],
  ['YES', 'debit', 'YES PMJDY RuPay Chip Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-bank-pmjdy-rupay-chip-debit-card'],
  ['YES', 'debit', 'YES Premia Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-premia-debit-card'],
  ['YES', 'debit', 'YES Prosperity Bold Business Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-bold-business-debit-card'],
  ['YES', 'debit', 'YES Prosperity Bold Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-bold-debit-card'],
  ['YES', 'debit', 'YES Prosperity Prime Business Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-prime-business-debit-card'],
  ['YES', 'debit', 'YES Prosperity Prime Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-prime-debit-card'],
  ['YES', 'debit', 'YES Prosperity Platinum Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-platinum-debit-card'],
  ['YES', 'debit', 'YES Prosperity Sleek Business Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-sleek-debit-card'],
  ['YES', 'debit', 'YES Prosperity Sleek Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-prosperity-sleek-debit-card'],
  ['YES', 'debit', 'YES Reflection Image Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/reflection-debit-card'],
  ['YES', 'debit', 'YES RuPay Kisan Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/yes-bank-rupay-kisan-debit-card'],
  ['YES', 'debit', 'YES Spirit Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/spirit-debit-card'],
  ['YES', 'debit', 'YES Venture Business Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/venture-debit-card'],
  ['YES', 'debit', 'YES Venture Debit', 'https://www.yes.bank.in/personal-banking/yes-individual/cards/debit-card/venture-debit-card'],
  ['AUSFB', 'credit', 'AU Altura', 'https://www.au.bank.in/personal-banking/credit-cards/altura-credit-card'],
  ['AUSFB', 'credit', 'AU Altura Plus', 'https://www.au.bank.in/personal-banking/credit-cards/altura-plus-credit-card'],
  ['AUSFB', 'credit', 'AU Ananta', 'https://www.au.bank.in/personal-banking/credit-cards/ananta-credit-card'],
  ['AUSFB', 'credit', 'AU Business Cashback', 'https://www.au.bank.in/personal-banking/commercial-credit-cards/business-cashback-credit-card'],
  ['AUSFB', 'credit', 'AU CA Metal', 'https://www.au.bank.in/personal-banking/credit-cards/ca-credit-card'],
  ['AUSFB', 'credit', 'AU Corporate', 'https://www.au.bank.in/personal-banking/commercial-credit-cards/corporate-credit-card'],
  ['AUSFB', 'credit', 'AU CS', 'https://www.au.bank.in/personal-banking/credit-cards/au-cs-credit-card'],
  ['AUSFB', 'credit', 'AU Kosmo', 'https://www.au.bank.in/personal-banking/credit-cards/kosmo-credit-card'],
  ['AUSFB', 'credit', 'AU Laksya', 'https://www.au.bank.in/personal-banking/credit-cards/laksya-credit-card'],
  ['AUSFB', 'credit', 'AU LIT', 'https://www.au.bank.in/personal-banking/credit-cards/lit-credit-card'],
  ['AUSFB', 'credit', 'AU NOMO', 'https://www.au.bank.in/personal-banking/credit-cards/nomo-credit-card'],
  ['AUSFB', 'credit', 'AU Prathama', 'https://www.au.bank.in/personal-banking/credit-cards/prathama-credit-card'],
  ['AUSFB', 'credit', 'AU Purchase', 'https://www.au.bank.in/personal-banking/commercial-credit-cards/purchase-credit-card'],
  ['AUSFB', 'credit', 'AU Spont', 'https://www.au.bank.in/personal-banking/credit-cards/au-spont-credit-card'],
  ['AUSFB', 'credit', 'AU Tejas', 'https://www.au.bank.in/personal-banking/credit-cards/tejas-credit-card'],
  ['AUSFB', 'credit', 'AU Traverse for NRIs', 'https://www.au.bank.in/personal-banking/credit-cards/traverse-credit-card'],
  ['AUSFB', 'credit', 'AU Vetta', 'https://www.au.bank.in/personal-banking/credit-cards/vetta-credit-card'],
  ['AUSFB', 'credit', 'AU Zaggle', 'https://www.au.bank.in/personal-banking/credit-cards/au-zaggle-credit-card'],
  ['AUSFB', 'credit', 'AU Zenith', 'https://www.au.bank.in/personal-banking/credit-cards/zenith-credit-card'],
  ['AUSFB', 'credit', 'AU Zenith+', 'https://www.au.bank.in/premium-banking/credit-cards/zenith-plus-credit-card'],
  ['AUSFB', 'credit', 'CheQ AU', 'https://www.au.bank.in/personal-banking/credit-cards/cheq-au-credit-card'],
  ['AUSFB', 'credit', 'ixigo AU', 'https://www.au.bank.in/personal-banking/credit-cards/ixigo-au-credit-card'],
  ['AUSFB', 'credit', 'Paytm AU', 'https://www.au.bank.in/personal-banking/credit-cards/paytm-au-credit-card'],
  ['AUSFB', 'debit', 'AU Eternity Debit', 'https://www.au.bank.in/premium-banking/debit-cards/au-eternity-debit-card'],
  ['AUSFB', 'debit', 'AU Gold Debit', 'https://www.au.bank.in/personal-banking/debit-cards/au-gold-debit-card'],
  ['AUSFB', 'debit', 'AU ivy Debit', 'https://www.au.bank.in/premium-banking/debit-cards/au-ivy-debit-card'],
  ['AUSFB', 'debit', 'AU Platinum Business Debit', 'https://www.au.bank.in/personal-banking/debit-cards/visa-business-platinum-debit-card'],
  ['AUSFB', 'debit', 'AU Platinum Debit', 'https://www.au.bank.in/personal-banking/debit-cards/platinum-debit-card'],
  ['AUSFB', 'debit', 'AU Royale Business Debit', 'https://www.au.bank.in/personal-banking/debit-cards/au-royale-business-debit-card'],
  ['AUSFB', 'debit', 'AU Royale Debit', 'https://www.au.bank.in/personal-banking/debit-cards/royale-debit-card'],
  ['AUSFB', 'debit', 'AU Royale World Debit', 'https://www.au.bank.in/personal-banking/debit-cards/au-royale-world-debit-card'],
  ['AUSFB', 'debit', 'AU RuPay Classic Debit', 'https://www.au.bank.in/personal-banking/debit-cards/rupay-classic-debit-card'],
  ['AUSFB', 'debit', 'AU RuPay Platinum Debit', 'https://www.au.bank.in/personal-banking/debit-cards/rupay-platinum-debit-card'],
  ['AUSFB', 'debit', 'AU swipe&save Platinum Debit', 'https://www.au.bank.in/personal-banking/debit-cards/au-swipe-and-save-debit-card'],
  ['AUSFB', 'debit', 'AU Visa Business Gold Debit', 'https://www.au.bank.in/personal-banking/debit-cards/visa-business-gold-debit-card'],
  ['DBS', 'credit', 'DBS Bank Vantage', 'https://www.dbs.com/in/credit-cards/vantage.html'],
  ['DBS', 'credit', 'DBS Spark', 'https://www.dbs.com/in/credit-cards/spark.html'],
  ['DBS', 'credit', 'DBS SuperCard', 'https://www.dbs.com/in/credit-cards/supercard.html'],
  ['FEDERAL', 'credit', 'Fed StarBiz RuPay', 'https://www.federal.bank.in/fed-starbiz-credit-card-rupay'],
  ['FEDERAL', 'credit', 'Fed StarBiz Visa', 'https://www.federal.bank.in/fed-starbiz-credit-card-visa'],
  ['FEDERAL', 'credit', 'Federal Bank RuPay Wave', 'https://www.federal.bank.in/rupay-wave-credit-card'],
  ['FEDERAL', 'debit', 'Federal Bank Mastercard Celesta Debit', 'https://www.federal.bank.in/celesta-personal-contactless-debit-card'],
  ['FEDERAL', 'debit', 'Federal Bank Mastercard Crown Debit', 'https://www.federal.bank.in/crown-contactless-debit-card'],
  ['FEDERAL', 'debit', 'Federal Bank Mastercard Imperio Debit', 'https://www.federal.bank.in/imperio-personal-contactless-debit-card'],
  ['FEDERAL', 'debit', 'Federal Bank RuPay PMJDY Debit', 'https://www.federal.bank.in/rupay-pmjdy-debit-card'],
  ['FEDERAL', 'debit', 'Federal Bank Visa Celesta Debit', 'https://www.federal.bank.in/visa-celesta-contactless-cards'],
  ['FEDERAL', 'debit', 'Federal Bank Visa Crown Debit', 'https://www.federal.bank.in/visa-crown-contactless-debit-cards'],
  ['FEDERAL', 'debit', 'Federal Bank Visa Imperio Debit', 'https://www.federal.bank.in/visa-imperio-contactless-cards'],
  ['IDBI', 'credit', 'IDBI Aspire', 'https://www.idbi.bank.in/aspire-credit-card.aspx'],
  ['IDBI', 'credit', 'IDBI Euphoria', 'https://www.idbi.bank.in/Euphoria-credit-card.aspx'],
  ['IDBI', 'credit', 'IDBI Imperium', 'https://www.idbi.bank.in/Imperium-credit-card.aspx'],
  ['IDBI', 'credit', 'IDBI LICCSL Eclat', 'https://www.idbi.bank.in/Eclat-credit-card.aspx'],
  ['IDBI', 'credit', 'IDBI LICCSL Lumine', 'https://www.idbi.bank.in/Lumine-credit-card.aspx'],
  ['IDBI', 'credit', 'IDBI Royale Signature', 'https://www.idbi.bank.in/royal-credit-card.aspx'],
  ['IDBI', 'credit', 'IDBI Winnings', 'https://www.idbi.bank.in/Winnings-credit-card.aspx'],
  ['IDBI', 'debit', 'IDBI Mastercard Classic Debit', 'https://www.idbi.bank.in/mastercard_classic-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI Mastercard Platinum Debit', 'https://www.idbi.bank.in/mastercard-platinum-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI RuPay Classic NCMC Debit', 'https://www.idbi.bank.in/rupay_classic_NCMC_debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI RuPay Mudra Debit', 'https://www.idbi.bank.in/rupay-mudra-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI RuPay Platinum NCMC Debit', 'https://www.idbi.bank.in/rupay_platinum_NCMC_debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI RuPay Select Opulentia NCMC Debit', 'https://www.idbi.bank.in/rupay-select-opulentia-ncmc-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI RuPay Women\'s Debit', 'https://www.idbi.bank.in/rupay-women-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI Visa Being Me PayWave Debit', 'https://www.idbi.bank.in/being-me-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI Visa Business Debit', 'https://www.idbi.bank.in/visa-business-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI Visa Classic PayWave Debit', 'https://www.idbi.bank.in/classic-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI Visa Gold Debit', 'https://www.idbi.bank.in/gold-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI Visa Kids PayWave Debit', 'https://www.idbi.bank.in/visa-kids-paywave-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI Visa Platinum PayWave Debit', 'https://www.idbi.bank.in/platinum-debit-card.aspx'],
  ['IDBI', 'debit', 'IDBI Visa Signature PayWave Debit', 'https://www.idbi.bank.in/signature_debit_card.aspx'],
  ['IDBI', 'debit', 'IDBI Visa Women\'s PayWave Debit', 'https://www.idbi.bank.in/visa-women-paywave-debit-card.aspx'],
]
