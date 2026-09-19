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
  cards,
  cardSharingSettings,
  friendships,
  users,
  type CardNetwork,
  type CardType,
  type Discoverability,
  type Visibility,
} from '../src/db/schema'
import { hashPassword } from '../src/server/crypto/password'
import { encryptPhone, normalizePhone, phoneHmac } from '../src/server/crypto/phone'
import { encrypt } from '../src/server/crypto/aead'

/** Every seeded account uses this password. Development only. */
const DEV_PASSWORD = 'cardcircle-dev-2026'

const BANKS = [
  { name: 'HDFC Bank', code: 'HDFC' },
  { name: 'State Bank of India', code: 'SBI' },
  { name: 'ICICI Bank', code: 'ICICI' },
  { name: 'Axis Bank', code: 'AXIS' },
  { name: 'Kotak Mahindra Bank', code: 'KOTAK' },
  { name: 'IDFC FIRST Bank', code: 'IDFC' },
  { name: 'RBL Bank', code: 'RBL' },
  { name: 'IndusInd Bank', code: 'INDUSIND' },
  { name: 'American Express', code: 'AMEX' },
]

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
  nickname: string
  variant?: string
  cardType: CardType
  network: CardNetwork
  bin: string
  last4: string
  expiry?: string
  discoverability?: Discoverability
  expiryVisibility?: Visibility
}

/** All BINs below are invented for development. */
const CARDS: CardSeed[] = [
  // --- The demo scenario: HDFC + Credit + Visa ---------------------------
  // Rahul is Alice's friend and shares both expiry and (via his profile) phone.
  {
    owner: 'rahul',
    bank: 'HDFC',
    nickname: 'Millennia',
    variant: 'Millennia Credit Card',
    cardType: 'credit',
    network: 'visa',
    bin: '540123',
    last4: '1234',
    expiry: '08/29',
    expiryVisibility: 'friends',
  },
  // Arjun is NOT Alice's friend: she sees the safe subset and a request CTA.
  {
    owner: 'arjun',
    bank: 'HDFC',
    nickname: 'Regalia',
    variant: 'Regalia Gold',
    cardType: 'credit',
    network: 'visa',
    bin: '456789',
    last4: '9821',
    expiry: '11/28',
    expiryVisibility: 'friends',
  },

  // --- Variety for filters ----------------------------------------------
  {
    owner: 'rahul',
    bank: 'HDFC',
    nickname: 'MoneyBack',
    cardType: 'credit',
    network: 'mastercard',
    bin: '532100',
    last4: '4477',
  },
  {
    owner: 'charlie',
    bank: 'HDFC',
    nickname: 'Salary Debit',
    cardType: 'debit',
    network: 'rupay',
    bin: '607412',
    last4: '3311',
  },
  {
    owner: 'rahul',
    bank: 'SBI',
    nickname: 'SBI Cashback',
    cardType: 'credit',
    network: 'visa',
    bin: '456701',
    last4: '9876',
    expiry: '02/30',
    expiryVisibility: 'nobody', // shared=false, to prove the toggle works
  },
  {
    owner: 'arjun',
    bank: 'SBI',
    nickname: 'IndianOil SBI',
    cardType: 'credit',
    network: 'visa',
    bin: '512345',
    last4: '3456',
  },
  {
    owner: 'charlie',
    bank: 'AXIS',
    nickname: 'Airtel Axis',
    cardType: 'credit',
    network: 'mastercard',
    bin: '532101',
    last4: '7777',
  },
  {
    owner: 'charlie',
    bank: 'ICICI',
    nickname: 'Amazon Pay ICICI',
    cardType: 'credit',
    network: 'visa',
    bin: '452100',
    last4: '2020',
  },
  {
    owner: 'david',
    bank: 'AMEX',
    nickname: 'Amex Platinum Travel',
    cardType: 'credit',
    network: 'amex',
    bin: '379100',
    last4: '1005',
  },
  {
    owner: 'david',
    bank: 'KOTAK',
    nickname: 'Kotak 811 Debit',
    cardType: 'debit',
    network: 'rupay',
    bin: '607413',
    last4: '8110',
  },
  {
    owner: 'arjun',
    bank: 'IDFC',
    nickname: 'IDFC Wealth',
    cardType: 'credit',
    network: 'visa',
    bin: '451200',
    last4: '6060',
  },

  // --- Privacy variations ------------------------------------------------
  // Private: nobody but David can see this, not even friends.
  {
    owner: 'david',
    bank: 'HDFC',
    nickname: 'Private Backup Card',
    cardType: 'credit',
    network: 'visa',
    bin: '540999',
    last4: '0001',
    discoverability: 'nobody',
  },
  // Friends-only: invisible to strangers in discovery.
  {
    owner: 'rahul',
    bank: 'ICICI',
    nickname: 'ICICI Coral (friends only)',
    cardType: 'credit',
    network: 'rupay',
    bin: '607414',
    last4: '5150',
    discoverability: 'friends',
  },
  // Bob's card. Bob and Alice have blocked each other, so Alice must never
  // see this in any listing or by direct id.
  {
    owner: 'bob',
    bank: 'RBL',
    nickname: 'RBL ShopRite',
    cardType: 'credit',
    network: 'mastercard',
    bin: '532555',
    last4: '9090',
  },
  {
    owner: 'alice',
    bank: 'INDUSIND',
    nickname: 'IndusInd Legend',
    cardType: 'credit',
    network: 'visa',
    bin: '456999',
    last4: '4321',
    expiry: '05/31',
    expiryVisibility: 'friends',
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
    console.log('Clearing existing data...')
    await db.execute(
      sql`TRUNCATE TABLE audit_logs, reports, blocks, friendships,
          card_sharing_settings, cards, sessions, users, banks, rate_limits
          RESTART IDENTITY CASCADE`,
    )

    console.log('Seeding banks...')
    const bankRows = await db.insert(banks).values(BANKS).returning()
    const bankByCode = new Map(bankRows.map((b) => [b.code, b.id]))

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
    for (const seed of CARDS) {
      const ownerId = userByKey.get(seed.owner)
      const bankId = bankByCode.get(seed.bank)
      if (!ownerId || !bankId) throw new Error(`Bad seed row: ${seed.nickname}`)

      const [card] = await db
        .insert(cards)
        .values({
          ownerId,
          bankId,
          nickname: seed.nickname,
          variant: seed.variant ?? null,
          cardType: seed.cardType,
          network: seed.network,
          bin: seed.bin,
          last4: seed.last4,
          expiryCt: seed.expiry ? encrypt('expiry-enc-v1', seed.expiry) : null,
          discoverability: seed.discoverability ?? 'everyone',
        })
        .returning()

      await db.insert(cardSharingSettings).values({
        cardId: card!.id,
        fieldName: 'expiry',
        visibility: seed.expiryVisibility ?? 'nobody',
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
    console.log('        Rahul is a friend (expiry + call button).')
    console.log('        Arjun is not (safe subset + friend request).\n')
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
