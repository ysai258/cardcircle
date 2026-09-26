/**
 * The seed catalogue of Indian card products.
 *
 * Users pick their card from this list instead of typing a nickname, so that
 * "who has an Airtel Axis card?" is answerable by matching a product rather
 * than guessing at free text. A nickname is whatever one person calls their
 * card; a product is the thing an offer actually names.
 *
 * ACCURACY: compiled from general knowledge of the Indian card market. It is
 * certainly incomplete and partly out of date — issuers launch, rename and
 * retire products constantly. That is exactly why the "Other" option exists:
 * anything missing is added by the first user who holds it, flagged
 * unverified until a human confirms it. This is a starting point, not an
 * authority.
 *
 * Known caveat: Citi's Indian consumer card portfolio transferred to Axis
 * Bank in 2023. The Citi entries remain because cards issued under those
 * names are still in wallets, but they are legacy.
 *
 * Fintech co-brands are filed under the ISSUING bank, because that is who
 * issues them — Jupiter's cards are CSB and Federal products. They carry
 * "(Jupiter)" so the people who hold them can actually find them, since
 * nobody calls it "an Edge+ CSB Bank card".
 *
 * Migration 0006 corrected this list after a user pointed out real cards
 * that were missing and two CSB entries that never existed. If you add to
 * it, check the issuer's own page first — this file has been wrong before.
 *
 * CANARA is the one bank here taken WHOLESALE from the issuer, rather than
 * recalled: all 16 credit and 15 debit cards come from canarabank.bank.in's
 * own card lists, and every page was opened and its <h1> read back. The
 * difference shows. What this file used to call "Canara Platinum Debit" is
 * five separate real cards (Visa Platinum, Mastercard Platinum, Mastercard
 * Platinum Women, RuPay Platinum Domestic, RuPay Platinum International), so
 * the vague name could never answer "who has THIS card" and could never be
 * linked to a page either.
 *
 * "Canara RuPay Debit" survives at the end of the debit list for one reason:
 * a real member's card points at it. Deleting it would break their card, and
 * nobody but its owner can say which of the five RuPay variants they hold.
 * It goes when they re-pick.
 *
 * Amex issues no debit cards in India, hence the empty list.
 */

export type CardProductSeed = {
  /** Bank `code`, as seeded in migration 0001. */
  bank: string
  credit: readonly string[]
  debit: readonly string[]
}

export const CARD_PRODUCTS: readonly CardProductSeed[] = [
  {
    "bank": "HDFC",
    "credit": [
      "HDFC Millennia",
      "HDFC Regalia",
      "HDFC Regalia Gold",
      "HDFC MoneyBack+",
      "HDFC Infinia",
      "HDFC Infinia Metal",
      "HDFC Diners Club Black",
      "HDFC Diners Club Privilege",
      "HDFC Freedom",
      "HDFC Business Regalia",
      "Swiggy HDFC",
      "Tata Neu Infinity HDFC",
      "Tata Neu Plus HDFC",
      "IndianOil HDFC",
      "6E Rewards IndiGo HDFC",
      "Marriott Bonvoy HDFC",
      "Shoppers Stop HDFC"
    ],
    "debit": [
      "HDFC Millennia Debit",
      "HDFC EasyShop Platinum Debit",
      "HDFC Rewards Debit",
      "HDFC Imperia Platinum Debit",
      "HDFC Times Points Debit",
      "HDFC RuPay Premium Debit"
    ]
  },
  {
    "bank": "AXIS",
    "credit": [
      "Flipkart Axis Bank",
      "Airtel Axis Bank",
      "Axis Magnus",
      "Axis Burgundy Private",
      "Axis Atlas",
      "Axis ACE",
      "Axis NEO",
      "Axis MY ZONE",
      "Axis Select",
      "Axis Privilege",
      "Axis Reserve",
      "Axis Horizon",
      "Axis Vistara",
      "Axis Vistara Infinite",
      "IndianOil Axis Bank",
      "Samsung Axis Bank Infinite",
      "Samsung Axis Bank Signature",
      "Axis Rewards"
    ],
    "debit": [
      "Axis Burgundy Debit",
      "Axis Priority Debit",
      "Axis Liberty Debit",
      "Axis Titanium Debit",
      "Axis Prestige Debit",
      "Axis RuPay Debit"
    ]
  },
  {
    "bank": "SBI",
    "credit": [
      "SBI SimplyCLICK",
      "SBI SimplySAVE",
      "SBI Card ELITE",
      "SBI Card PRIME",
      "SBI Cashback Card",
      "IRCTC SBI Platinum",
      "BPCL SBI Octane",
      "BPCL SBI Card",
      "Air India SBI Signature",
      "Tata Neu Infinity SBI",
      "Club Vistara SBI",
      "SBI Card PULSE",
      "SBI Card Unnati"
    ],
    "debit": [
      "SBI Classic Debit",
      "SBI Global International Debit",
      "SBI Gold International Debit",
      "SBI Platinum International Debit",
      "SBI RuPay NCMC Debit",
      "SBI Yuva Debit",
      "SBI IOCL Co-Branded Contactless RuPay Debit Card",
      "SBI HPCL Co-Branded Debit Card",
      "SBI Visa Infinite Debit Card",
      "SBI Mastercard World Debit Card",
      "SBI Pragati Platinum Debit Card",
      "SBI Nari Shakti Platinum Debit Card",
      "SBI My Card International Debit Card",
      "SBI One Touch Debit Card",
      "SBI Virtual Debit Card"
    ]
  },
  {
    "bank": "ICICI",
    "credit": [
      "Amazon Pay ICICI",
      "ICICI Coral",
      "ICICI Rubyx",
      "ICICI Sapphiro",
      "ICICI Emeralde",
      "ICICI Emeralde Private Metal",
      "MakeMyTrip ICICI",
      "HPCL Super Saver ICICI",
      "Manchester United ICICI",
      "ICICI Platinum Chip",
      "ICICI Expressions"
    ],
    "debit": [
      "ICICI Coral Debit",
      "ICICI Rubyx Debit",
      "ICICI Sapphiro Debit",
      "ICICI Expressions Debit",
      "ICICI Platinum Chip Debit"
    ]
  },
  {
    "bank": "KOTAK",
    "credit": [
      "Kotak 811 Dream Different",
      "Kotak League Platinum",
      "Kotak Royale Signature",
      "Kotak Zen Signature",
      "Kotak IndianOil",
      "Myntra Kotak",
      "Kotak White",
      "Kotak White Reserve",
      "PVR INOX Kotak",
      "Kotak Solitaire",
      "Kotak Mojo Platinum"
    ],
    "debit": [
      "Kotak 811 Debit",
      "Kotak Platinum Debit",
      "Kotak Privy League Debit",
      "Kotak Classic Debit",
      "Kotak Silk Debit"
    ]
  },
  {
    "bank": "IDFC",
    "credit": [
      "IDFC FIRST Select",
      "IDFC FIRST Classic",
      "IDFC FIRST Millennia",
      "IDFC FIRST Wealth",
      "IDFC FIRST WOW",
      "IDFC FIRST Power",
      "IDFC FIRST Power+",
      "Club Vistara IDFC FIRST",
      "IDFC FIRST SWYP"
    ],
    "debit": [
      "IDFC FIRST Visa Signature Debit",
      "IDFC FIRST Platinum Debit",
      "IDFC FIRST Wealth Debit",
      "IDFC FIRST Classic Debit"
    ]
  },
  {
    "bank": "AMEX",
    "credit": [
      "Amex Membership Rewards",
      "Amex Platinum Travel",
      "Amex Platinum Charge",
      "Amex Gold Charge",
      "Amex SmartEarn",
      "Amex Platinum Reserve"
    ],
    "debit": []
  },
  {
    "bank": "RBL",
    "credit": [
      "RBL ShopRite",
      "RBL Platinum Maxima",
      "RBL Platinum Maxima Plus",
      "RBL Icon",
      "RBL World Safari",
      "RBL Popcorn",
      "Bajaj Finserv RBL SuperCard",
      "RBL Insignia Preferred Banking"
    ],
    "debit": [
      "RBL Classic Debit",
      "RBL Signature Debit",
      "RBL Platinum Debit"
    ]
  },
  {
    "bank": "INDUSIND",
    "credit": [
      "IndusInd Legend",
      "IndusInd Pinnacle",
      "IndusInd Iconia",
      "IndusInd Platinum Aura Edge",
      "IndusInd EazyDiner",
      "IndusInd Tiger",
      "IndusInd Nexxt",
      "IndusInd Platinum RuPay"
    ],
    "debit": [
      "IndusInd Platinum Debit",
      "IndusInd Signature Debit",
      "IndusInd Classic Debit"
    ]
  },
  {
    "bank": "YES",
    "credit": [
      "YES Prosperity Rewards Plus",
      "YES Premia",
      "YES First Preferred",
      "YES First Exclusive",
      "YES Marquee",
      "Paisabazaar PaisaSave YES",
      "YES EMI Card"
    ],
    "debit": [
      "YES Prosperity Debit",
      "YES First Debit",
      "YES Platinum Debit"
    ]
  },
  {
    "bank": "BOB",
    "credit": [
      "BOB Eterna",
      "BOB Premier",
      "BOB Select",
      "BOB Easy",
      "BOB Snapdeal",
      "IRCTC BOB",
      "BOB Varunah"
    ],
    "debit": [
      "BOB Classic Debit",
      "BOB Platinum Debit",
      "BOB RuPay Select Debit"
    ]
  },
  {
    "bank": "PNB",
    "credit": [
      "PNB RuPay Select",
      "PNB RuPay Platinum",
      "PNB Global Gold",
      "PNB Global Classic",
      "PNB Patanjali RuPay Platinum"
    ],
    "debit": [
      "PNB Platinum Debit",
      "PNB Classic Debit",
      "PNB RuPay Debit"
    ]
  },
  {
    "bank": "CANARA",
    "credit": [
        "Canara RuPay Select",
        "Canara Visa Platinum",
        "Canara Mastercard Platinum",
        "Canara RuPay Platinum",
        "Canara Visa Signature",
        "Canara Mastercard World",
        "Canara RuPay Select Secured",
        "Canara Visa Corporate",
        "Canara Mastercard Gold",
        "Canara Visa Gold",
        "Canara RuPay Platinum Secured",
        "Canara Mastercard Gold Secured",
        "Canara Visa Gold Secured",
        "Canara RuPay Classic",
        "Canara Mastercard Standard",
        "Canara Visa Classic"
    ],
    "debit": [
        "Canara RuPay Select Debit",
        "Canara Mastercard World Debit",
        "Canara Visa Platinum Debit",
        "Canara RuPay Platinum International Debit",
        "Canara Mastercard World NRI Platina Debit",
        "Canara Visa Classic Debit",
        "Canara RuPay Platinum Domestic Debit",
        "Canara Mastercard Platinum Women Debit",
        "Canara Mastercard Platinum Millennial Debit",
        "Canara RuPay Classic Debit",
        "Canara Mastercard Platinum Debit",
        "Canara Mastercard Business Debit",
        "Canara Mastercard Standard Debit",
        "Canara RuPay Millennial Debit",
        "Canara RuPay Women Platinum Debit",
        "Canara RuPay Debit"
    ]
  },
  {
    "bank": "UNION",
    "credit": [
      "Union Bank RuPay Select",
      "Union Bank Platinum",
      "Union Bank Classic",
      "Union Bank Signature"
    ],
    "debit": [
      "Union Bank Classic Debit",
      "Union Bank Platinum Debit",
      "Union Bank RuPay Debit"
    ]
  },
  {
    "bank": "IDBI",
    "credit": [
      "IDBI Aspire",
      "IDBI Imperium",
      "IDBI Winnings",
      "IDBI Royale Signature",
      "IDBI Euphoria"
    ],
    "debit": [
      "IDBI Platinum Debit",
      "IDBI RuPay Debit",
      "IDBI Gold Debit"
    ]
  },
  {
    "bank": "FEDERAL",
    "credit": [
      "Federal Bank Celesta",
      "Federal Bank Imperio",
      "Federal Bank Signet",
      "Scapia Federal",
      "Federal Bank RuPay Signet",
      "Edge Federal Bank VISA Credit Card (Jupiter)"
    ],
    "debit": [
      "Federal Bank Platinum Debit",
      "Federal Bank Signature Debit",
      "FedFirst Debit"
    ]
  },
  {
    "bank": "BOI",
    "credit": [
      "BOI India Card",
      "BOI Taj Card",
      "BOI RuPay Platinum",
      "BOI Bharat Card"
    ],
    "debit": [
      "BOI Classic Debit",
      "BOI Platinum Debit",
      "BOI RuPay Debit"
    ]
  },
  {
    "bank": "INDIANBANK",
    "credit": [
      "Indian Bank Platinum",
      "Indian Bank Gold",
      "Indian Bank RuPay Select"
    ],
    "debit": [
      "Indian Bank Classic Debit",
      "Indian Bank Platinum Debit",
      "Indian Bank RuPay Debit"
    ]
  },
  {
    "bank": "CENTRAL",
    "credit": [
      "Central Bank RuPay Platinum",
      "Central Bank Aspire",
      "Central Bank Classic"
    ],
    "debit": [
      "Central Bank Classic Debit",
      "Central Bank Platinum Debit",
      "Central Bank RuPay Debit"
    ]
  },
  {
    "bank": "AUSFB",
    "credit": [
      "AU LIT",
      "AU Altura",
      "AU Altura Plus",
      "AU Vetta",
      "AU Zenith",
      "AU Zenith+",
      "AU Xcite",
      "AU InstaPay",
      "AU NOMO"
    ],
    "debit": [
      "AU Platinum Debit",
      "AU Signature Debit",
      "AU Royale Debit"
    ]
  },
  {
    "bank": "BANDHAN",
    "credit": [
      "Bandhan Bank Standard",
      "Bandhan Bank Select",
      "Bandhan Bank Premium",
      "Bandhan Bank One"
    ],
    "debit": [
      "Bandhan Classic Debit",
      "Bandhan Platinum Debit",
      "Bandhan RuPay Debit"
    ]
  },
  {
    "bank": "SCB",
    "credit": [
      "Standard Chartered Ultimate",
      "Standard Chartered Platinum Rewards",
      "Standard Chartered Smart",
      "Standard Chartered Rewards",
      "Standard Chartered EaseMyTrip",
      "Standard Chartered DigiSmart",
      "Standard Chartered Manhattan Platinum"
    ],
    "debit": [
      "Standard Chartered Platinum Debit",
      "Standard Chartered Visa Infinite Debit"
    ]
  },
  {
    "bank": "HSBC",
    "credit": [
      "HSBC Cashback",
      "HSBC Platinum",
      "HSBC Premier Mastercard",
      "HSBC TravelOne",
      "HSBC Visa Platinum"
    ],
    "debit": [
      "HSBC Premier Debit",
      "HSBC Advance Debit"
    ]
  },
  {
    "bank": "CITI",
    "credit": [
      "Citi Cashback",
      "Citi Rewards",
      "Citi PremierMiles",
      "Citi Prestige",
      "Citi IndianOil",
      "Citi First Citizen"
    ],
    "debit": [
      "Citi Platinum Debit",
      "Citi Priority Debit"
    ]
  },
  {
    "bank": "DBS",
    "credit": [
      "DBS Bank Vantage",
      "DBS Bank Platinum",
      "DBS digibank Rewards"
    ],
    "debit": [
      "DBS digibank Debit",
      "DBS Visa Debit",
      "DBS Treasures Debit"
    ]
  },
  {
    "bank": "CSB",
    "credit": [
      "Edge+ CSB Bank RuPay Credit Card (Jupiter)",
      "Edge CSB Bank RuPay Credit Card (Jupiter)",
      "CSB OneCard"
    ],
    "debit": [
      "CSB Classic Debit",
      "CSB Platinum Debit",
      "CSB RuPay Debit"
    ]
  }
]
