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
      "YES Marquee",
      "YES EMI Card",
      "YES RESERV",
      "YES Elite+",
      "YES ACE",
      "YES Select",
      "YES RuPay",
      "YES Klick",
      "YES FinBooster",
      "YES Paisabazaar PaisaSave",
      "YES Paisabazaar PaisaSave RuPay",
      "YES POP-CLUB",
      "YES ANQ Phi",
      "YES UNI",
      "YES UNI RuPay",
      "YES Zagg",
      "YES BYOC",
      "YES Wellness",
      "YES Wellness Plus",
      "YES Essence Women's",
      "YES novio",
      "YES novio RuPay"
    ],
    "debit": [
      "YES First Debit",
      "YES Prosperity Sleek Debit",
      "YES Prosperity Bold Debit",
      "YES Prosperity Prime Debit",
      "YES Prosperity Sleek Business Debit",
      "YES Prosperity Bold Business Debit",
      "YES Prosperity Prime Business Debit",
      "YES Prosperity RuPay Platinum Debit",
      "YES Premia Debit",
      "YES Grandeur Debit",
      "YES Grandeur Business Debit",
      "YES First Business Debit",
      "YES Venture Debit",
      "YES Venture Business Debit",
      "YES Spirit Debit",
      "YES Aura Debit",
      "YES Apex Debit",
      "YES Apex Metal Debit",
      "YES Reflection Image Debit",
      "YES PMJDY RuPay Chip Debit",
      "YES RuPay Kisan Debit",
      "YES Elegance Debit",
      "YES Healthfit Debit",
      "YES Emerge Debit",
      "YES Explore Debit",
      "YES Engage Debit",
      "YES Element Debit",
      "YES Private Debit"
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
      "BOB RuPay Select Debit",
      "BOB World Visa Opulence Debit",
      "BOB World Visa Sapphire Debit",
      "BOB Mastercard World Debit",
      "BOB EaseMyTrip Debit",
      "BOB inSIGHT Braille Debit",
      "BOB Visa Platinum Debit",
      "BOB Mastercard Platinum Debit",
      "BOB RuPay Platinum Debit",
      "BOB Visa Vyapaar Business Debit",
      "BOB World Yoddha Debit",
      "BOB World Agniveer Debit",
      "BOB Visa Classic Debit",
      "BOB Mastercard Classic Debit",
      "BOB RuPay Classic Debit",
      "BOB RuPay Qsparc NCMC Debit",
      "BOB Virtual Debit"
    ]
  },
  {
    "bank": "PNB",
    "credit": [
      "PNB RuPay Select",
      "PNB RuPay Platinum",
      "PNB Patanjali RuPay Platinum",
      "PNB Visa Gold",
      "PNB Visa Classic",
      "PNB Visa Platinum",
      "PNB Wave & Pay",
      "PNB Rakshak RuPay Platinum",
      "PNB Rakshak RuPay Select",
      "PNB Visa Signature",
      "PNB RuPay Millennial",
      "PNB Patanjali RuPay Select",
      "PNB BLISS",
      "PNB SALARY RuPay Platinum",
      "PNB SALARY RuPay Select",
      "PNB Metal LUXURA on RuPay",
      "PNB Metal LUXURA on Visa",
      "PNB KIWI Co-Branded",
      "PNB Zaggle Co-Branded Twin",
      "PNB Prakram",
      "PNB Premium Metal LUXURA (Indian Army)",
      "PNB RRB Co-Branded RuPay Select"
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
      "Union Bank NEXTERIA",
      "Union Bank Unicorn RuPay",
      "Union Bank DIVAA ICON",
      "Union Bank PM SVANidhi",
      "Union Bank JCB Wellness",
      "Union Bank JCB Health",
      "Union Bank UNI-CARBON",
      "Union Bank Sparsh",
      "Union Bank RuPay Platinum",
      "Union Bank Visa Signature",
      "Union Bank Visa Platinum",
      "Union Bank Visa Gold"
    ],
    "debit": [
      "Union Bank HNI Emperio Metal Debit",
      "Union Bank RuPay Empower Her Debit",
      "Union Bank Qsparc RuPay Debit",
      "Union Bank Business Platinum Debit",
      "Union Bank Business Debit (Platinum)",
      "Union Bank Classic Debit (RuPay / Visa)",
      "Union Bank Platinum Debit (RuPay / Visa / Mastercard)",
      "Union Bank RuPay Select Debit"
    ]
  },
  {
    "bank": "IDBI",
    "credit": [
      "IDBI Aspire",
      "IDBI Imperium",
      "IDBI Winnings",
      "IDBI Royale Signature",
      "IDBI Euphoria",
      "IDBI LICCSL Lumine",
      "IDBI LICCSL Eclat"
    ],
    "debit": [
      "IDBI Visa Signature PayWave Debit",
      "IDBI Visa Platinum PayWave Debit",
      "IDBI Visa Classic PayWave Debit",
      "IDBI Visa Gold Debit",
      "IDBI Visa Business Debit",
      "IDBI Visa Women's PayWave Debit",
      "IDBI Visa Being Me PayWave Debit",
      "IDBI Visa Kids PayWave Debit",
      "IDBI Mastercard Classic Debit",
      "IDBI Mastercard Platinum Debit",
      "IDBI RuPay Select Opulentia NCMC Debit",
      "IDBI RuPay Platinum NCMC Debit",
      "IDBI RuPay Classic NCMC Debit",
      "IDBI RuPay Women's Debit",
      "IDBI RuPay Mudra Debit"
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
      "Edge Federal Bank VISA Credit Card (Jupiter)",
      "Federal Bank RuPay Wave",
      "Fed StarBiz Visa",
      "Fed StarBiz RuPay"
    ],
    "debit": [
      "FedFirst Debit",
      "Federal Bank Visa Celesta Debit",
      "Federal Bank Visa Imperio Debit",
      "Federal Bank Visa Crown Debit",
      "Federal Bank Mastercard Celesta Debit",
      "Federal Bank Mastercard Imperio Debit",
      "Federal Bank Mastercard Crown Debit",
      "Federal Bank RuPay PMJDY Debit"
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
      "Central Bank RuPay Select Wellness Debit",
      "Central Bank RuPay Platinum Debit",
      "Central Bank RuPay Classic Debit",
      "Central Bank Business Debit",
      "Central Bank Visa Platinum Debit"
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
      "AU NOMO",
      "AU Ananta",
      "AU Laksya",
      "AU Tejas",
      "AU Prathama",
      "AU CA Metal",
      "AU CS",
      "AU Spont",
      "AU Kosmo",
      "AU Traverse for NRIs",
      "AU Zaggle",
      "CheQ AU",
      "Paytm AU",
      "ixigo AU",
      "AU Xcite Ultra",
      "AU Xcite Ace",
      "AU Purchase",
      "AU Business Cashback",
      "AU Corporate"
    ],
    "debit": [
      "AU Platinum Debit",
      "AU Royale Debit",
      "AU ivy Debit",
      "AU Eternity Debit",
      "AU Royale World Debit",
      "AU Royale Business Debit",
      "AU Gold Debit",
      "AU Visa Platinum Debit",
      "AU Platinum Business Debit",
      "AU Visa Business Gold Debit",
      "AU RuPay Platinum Debit",
      "AU RuPay Classic Debit",
      "AU swipe&save Platinum Debit"
    ]
  },
  {
    "bank": "BANDHAN",
    "credit": [
      "Bandhan Bank Lumina",
      "Bandhan Bank Flare",
      "Bandhan Bank Ignite",
      "Bandhan Bank Sparks"
    ],
    "debit": [
      "Bandhan Bank Legacy Debit",
      "Bandhan Bank Elite Plus Debit",
      "Bandhan Bank Elite Debit",
      "Bandhan Bank Mastercard Platinum Debit",
      "Bandhan Bank Mastercard Platinum Plus Debit",
      "Bandhan Bank Mastercard Titanium Debit",
      "Bandhan Bank Visa Platinum Debit",
      "Bandhan Bank RuPay Platinum Debit",
      "Bandhan Bank Visa Classic Debit",
      "Bandhan Bank RuPay Classic Debit",
      "Bandhan Bank Avni Debit",
      "Bandhan Bank PMJDY Debit",
      "Bandhan Bank Business Standard Debit"
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
      "HSBC TravelOne",
      "HSBC Visa Platinum",
      "HSBC Premier",
      "HSBC Live+",
      "HSBC Taj",
      "HSBC RuPay Platinum",
      "HSBC RuPay Cashback"
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
      "DBS Spark",
      "DBS SuperCard"
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
