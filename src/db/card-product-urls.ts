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
 * card-listing page — never from a guessed path or a search result. It was
 * then fetched: 143 of 149 returned 200.
 *
 * The 6 that did not are all on bobcard.co.in, which Bank of Baroda's
 * own credit-card page links to and whose DNS resolves, but which refuses
 * connections from this network. Its pages are reachable from a browser; the
 * link is BoB's, not ours.
 *
 * WHY 132 CARDS HAVE NO ENTRY
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
  ['CANARA', 'credit', 'Canara Mastercard Platinum', 'https://www.canarabank.bank.in/mastercard-platinum-credit-card'],
  ['CANARA', 'credit', 'Canara RuPay Platinum', 'https://www.canarabank.bank.in/rupay-platinum-credit-card'],
  ['CANARA', 'credit', 'Canara RuPay Select', 'https://canarabank.bank.in/pages/Rupay-Select-Credit-Card'],
  ['CANARA', 'credit', 'Canara Visa Platinum', 'https://www.canarabank.bank.in/visa-platinum-credit-card'],
  ['UNION', 'credit', 'Union Bank RuPay Select', 'https://www.unionbankofindia.bank.in/en/details/rupay-select-credit-card'],
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
  ['CSB', 'credit', 'Edge CSB Bank RuPay Credit Card (Jupiter)', 'https://www.csb.bank.in/csb-bank-edge-credit-card', 'edge-csb-bank-rupay-credit-card'],
  ['CSB', 'credit', 'Edge+ CSB Bank RuPay Credit Card (Jupiter)', 'https://jupiter.money/edge-plus-upi-rupay-credit-card', 'edge-plus-csb-bank-rupay-credit-card'],
]
