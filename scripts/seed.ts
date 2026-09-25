/**
 * Development seed data.
 *
 * EVERY value here is fabricated. The BINs and last-4s are not real card
 * numbers, and the phone numbers are in reserved-looking ranges that belong
 * to nobody. Never seed this database from real cardholder data.
 *
 * Builds the exact scenario from the spec so the demo can be walked:
 *   Alice wants an HDFC Visa credit card discount.
 *   She is friends with Rahul (who shares expiry + phone),
 *   and not friends with Arjun (so she must send a request).
 */
import './load-env'

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  banks,
  blocks,
  cardProducts,
  cards,
  friendships,
  users,
  type CardNetwork,
  type CardType,
  type Discoverability,
  type FieldVisibility,
  type Visibility,
} from '../src/db/schema'
import { hashPassword } from '../src/server/crypto/password'
import { encryptPhone, normalizePhone, phoneHmac } from '../src/server/crypto/phone'

/** Every seeded account uses this password. Development only. */
const DEV_PASSWORD = 'cardcircle-dev-2026'


const PEOPLE = [
  { key: 'alice', name: 'Alice', phone: '9000000001' },
  { key: 'rahul', name: 'Rahul', phone: '9000000002' },
  { key: 'arjun', name: 'Arjun', phone: '9000000003' },
  { key: 'bob', name: 'Bob', phone: '9000000004' },
  { key: 'charlie', name: 'Charlie', phone: '9000000005' },
  { key: 'david', name: 'David', phone: '9000000006' },
]

type CardSeed = {
  owner: string
  bank: string
  /** Must match a product name seeded by migration 0004. */
  product: string
  cardType: CardType
  network: CardNetwork
  bin: string
  discoverability?: Discoverability
  binVisibility?: FieldVisibility
}

/** All BINs below are invented for development. */
const CARDS: CardSeed[] = [
  // --- The demo scenario: HDFC + Credit + Visa ---------------------------
  // Rahul is Alice's friend and shares his BIN with friends.
  {
    owner: 'rahul',
    bank: 'HDFC',
    product: 'HDFC Millennia',
    cardType: 'credit',
    network: 'visa',
    bin: '540123',
    binVisibility: 'friends',
  },
  // Arjun is NOT Alice's friend, and masks his BIN entirely: she can see he
  // holds the card, but not a single digit of it.
  {
    owner: 'arjun',
    bank: 'HDFC',
    product: 'HDFC Regalia',
    cardType: 'credit',
    network: 'visa',
    bin: '456789',
    binVisibility: 'nobody',
  },

  // --- Variety for filters ----------------------------------------------
  {
    owner: 'rahul',
    bank: 'HDFC',
    product: 'HDFC MoneyBack+',
    cardType: 'credit',
    network: 'mastercard',
    bin: '532100',
    binVisibility: 'everyone',
  },
  {
    owner: 'charlie',
    bank: 'HDFC',
    product: 'HDFC Millennia Debit',
    cardType: 'debit',
    network: 'rupay',
    bin: '607412',
  },
  {
    owner: 'rahul',
    bank: 'SBI',
    product: 'SBI Cashback Card',
    cardType: 'credit',
    network: 'visa',
    bin: '456701',
    binVisibility: 'everyone',
  },
  {
    owner: 'arjun',
    bank: 'SBI',
    product: 'SBI SimplyCLICK',
    cardType: 'credit',
    network: 'visa',
    bin: '512345',
  },
  {
    owner: 'charlie',
    bank: 'AXIS',
    product: 'Airtel Axis Bank',
    cardType: 'credit',
    network: 'mastercard',
    bin: '532101',
    binVisibility: 'everyone',
  },
  {
    owner: 'charlie',
    bank: 'AXIS',
    product: 'Flipkart Axis Bank',
    cardType: 'credit',
    network: 'visa',
    bin: '452100',
    binVisibility: 'everyone',
  },
  {
    owner: 'charlie',
    bank: 'ICICI',
    product: 'Amazon Pay ICICI',
    cardType: 'credit',
    network: 'visa',
    bin: '452101',
    binVisibility: 'everyone',
  },
  {
    owner: 'david',
    bank: 'AMEX',
    product: 'Amex Platinum Travel',
    cardType: 'credit',
    network: 'amex',
    bin: '379100',
  },
  {
    owner: 'david',
    bank: 'KOTAK',
    product: 'Kotak 811 Debit',
    cardType: 'debit',
    network: 'rupay',
    bin: '607413',
  },
  {
    owner: 'arjun',
    bank: 'IDFC',
    product: 'IDFC FIRST Wealth',
    cardType: 'credit',
    network: 'visa',
    bin: '451200',
  },

  // --- Privacy variations ------------------------------------------------
  // Private: nobody but David can see this, not even friends.
  {
    owner: 'david',
    bank: 'HDFC',
    product: 'HDFC Infinia',
    cardType: 'credit',
    network: 'visa',
    bin: '540999',
    discoverability: 'nobody',
  },
  // Friends-only: invisible to strangers in discovery.
  {
    owner: 'rahul',
    bank: 'ICICI',
    product: 'ICICI Coral',
    cardType: 'credit',
    network: 'rupay',
    bin: '607414',
    discoverability: 'friends',
  },
  // Bob's card. Bob and Alice have blocked each other, so Alice must never
  // see this in any listing or by direct id.
  {
    owner: 'bob',
    bank: 'RBL',
    product: 'RBL ShopRite',
    cardType: 'credit',
    network: 'mastercard',
    bin: '532555',
  },
  {
    owner: 'alice',
    bank: 'INDUSIND',
    product: 'IndusInd Legend',
    cardType: 'credit',
    network: 'visa',
    bin: '456999',
    binVisibility: 'friends',
  },
]

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database')
  }

  const client = postgres(url, { max: 1, onnotice: () => {} })
  const db = drizzle(client)

  try {
    // Deletes, not TRUNCATE ... CASCADE.
    //
    // CASCADE drags in every table with a foreign key to the ones listed —
    // and card_products references users through `created_by`. Truncating
    // users therefore wiped the entire 270-row product catalogue, which
    // ships as an applied migration and so does NOT come back when
    // migrations re-run. Explicit deletes in dependency order keep banks and
    // card_products, which are reference data, not fixtures.
    console.log('Clearing existing user data...')
    await db.execute(sql`DELETE FROM audit_logs`)
    await db.execute(sql`DELETE FROM reports`)
    await db.execute(sql`DELETE FROM blocks`)
    await db.execute(sql`DELETE FROM friendships`)
    await db.execute(sql`DELETE FROM cards`)
    await db.execute(sql`DELETE FROM recovery_codes`)
    await db.execute(sql`DELETE FROM sessions`)
    await db.execute(sql`DELETE FROM rate_limits`)
    // Detach user-submitted products before their authors are removed, so
    // the catalogue survives with the entries intact.
    await db.execute(sql`UPDATE card_products SET created_by = NULL`)
    await db.execute(sql`DELETE FROM users`)

    const bankRows = await db.select({ id: banks.id, code: banks.code }).from(banks)
    const bankByCode = new Map(bankRows.map((b) => [b.code, b.id]))

    if (bankByCode.size === 0) {
      throw new Error(
        'No banks found. Run `npm run db:migrate` first — banks ship as migration 0001.',
      )
    }

    for (const code of new Set(CARDS.map((c) => c.bank))) {
      if (!bankByCode.has(code)) {
        throw new Error(`Seed references unknown bank code: ${code}`)
      }
    }

    console.log('Seeding users...')
    const passwordHash = await hashPassword(DEV_PASSWORD)
    const userValues = PEOPLE.map((person) => {
      const phone = normalizePhone(person.phone)
      if (!phone) throw new Error(`Invalid seed phone: ${person.phone}`)
      return {
        name: person.name,
        phoneHmac: phoneHmac(phone.e164),
        phoneCt: encryptPhone(phone.e164),
        phoneCountryCode: phone.countryCode,
        phoneLast4: phone.last4,
        passwordHash,
        // Rahul opts in to sharing his number with friends — this is what
        // makes the "Call Rahul" button appear for Alice.
        phoneVisibility: (person.key === 'rahul'
          ? 'friends'
          : 'nobody') as Visibility,
      }
    })

    const userRows = await db.insert(users).values(userValues).returning()
    const userByKey = new Map(
      PEOPLE.map((person, index) => [person.key, userRows[index]!.id]),
    )

    console.log('Seeding cards...')
    const productRows = await db
      .select({
        id: cardProducts.id,
        name: cardProducts.name,
        bankId: cardProducts.bankId,
        cardType: cardProducts.cardType,
      })
      .from(cardProducts)

    // Keyed by bank + type + name, which is how the seed refers to them.
    const productByKey = new Map(
      productRows.map((row) => [`${row.bankId}|${row.cardType}|${row.name}`, row.id]),
    )

    for (const seed of CARDS) {
      const ownerId = userByKey.get(seed.owner)
      const bankId = bankByCode.get(seed.bank)
      if (!ownerId || !bankId) throw new Error(`Bad seed row: ${seed.product}`)

      const productId = productByKey.get(`${bankId}|${seed.cardType}|${seed.product}`)
      if (!productId) {
        // Fail loudly: a silently skipped card would make the demo lie.
        throw new Error(
          `Seed references a product not in the catalogue: ${seed.bank} / ${seed.cardType} / ${seed.product}`,
        )
      }

      await db.insert(cards).values({
        ownerId,
        productId,
        network: seed.network,
        bin: seed.bin,
        binVisibility: seed.binVisibility ?? 'friends',
        discoverability: seed.discoverability ?? 'everyone',
      })
    }

    console.log('Seeding relationships...')
    const id = (key: string): string => {
      const value = userByKey.get(key)
      if (!value) throw new Error(`Unknown seed user: ${key}`)
      return value
    }

    await db.insert(friendships).values([
      // Alice <-> Rahul: accepted. The happy path of the demo.
      {
        requesterId: id('alice'),
        recipientId: id('rahul'),
        status: 'accepted',
        acceptedAt: new Date(),
      },
      // Alice <-> David: accepted, but David shares nothing.
      {
        requesterId: id('david'),
        recipientId: id('alice'),
        status: 'accepted',
        acceptedAt: new Date(),
      },
      // Charlie -> Alice: pending. Shows up in Alice's Requests tab.
      {
        requesterId: id('charlie'),
        recipientId: id('alice'),
        status: 'pending',
      },
      // Rahul <-> Charlie: accepted, so Charlie sees Rahul's friends-only card.
      {
        requesterId: id('rahul'),
        recipientId: id('charlie'),
        status: 'accepted',
        acceptedAt: new Date(),
      },
    ])

    // Alice and Bob have blocked each other.
    await db.insert(blocks).values([
      { blockerId: id('alice'), blockedId: id('bob') },
      { blockerId: id('bob'), blockedId: id('alice') },
    ])

    console.log('\nSeed complete.\n')
    console.log('  Sign in with any of these (all fake, development only):')
    for (const person of PEOPLE) {
      console.log(
        `    ${person.name.padEnd(8)} +91 ${person.phone}   password: ${DEV_PASSWORD}`,
      )
    }
    console.log('\n  Demo: sign in as Alice -> Home -> HDFC Bank -> Credit -> Visa')
    console.log('        Rahul is a friend: BIN visible, call button.')
    console.log('        Arjun is not, and masks his BIN entirely.\n')
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
