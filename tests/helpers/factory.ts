import { randomUUID } from 'node:crypto'
import { db } from '@/db'
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
} from '@/db/schema'
import { productSlug } from '@/server/modules/cards/product-slug'
import { hashPassword } from '@/server/crypto/password'
import { encryptPhone, normalizePhone, phoneHmac } from '@/server/crypto/phone'

/**
 * Fixture builders for the security suite.
 *
 * Insert directly through Drizzle rather than through the service layer, so
 * a bug in a service cannot quietly shape the fixtures the tests rely on.
 */

let phoneCounter = 0

/** Distinct, valid Indian mobile numbers. All fabricated. */
function nextPhone(): string {
  phoneCounter += 1
  return `98${String(70000000 + phoneCounter).padStart(8, '0')}`
}

export async function createTestUser(
  overrides: {
    name?: string
    phone?: string
    phoneVisibility?: Visibility
    status?: 'active' | 'disabled'
    password?: string
  } = {},
): Promise<{ id: string; name: string; phone: string }> {
  const rawPhone = overrides.phone ?? nextPhone()
  const phone = normalizePhone(rawPhone)
  if (!phone) throw new Error(`Invalid test phone: ${rawPhone}`)

  const [row] = await db
    .insert(users)
    .values({
      name: overrides.name ?? `User ${randomUUID().slice(0, 8)}`,
      phoneHmac: phoneHmac(phone.e164),
      phoneCt: encryptPhone(phone.e164),
      phoneCountryCode: phone.countryCode,
      phoneLast4: phone.last4,
      passwordHash: await hashPassword(
        overrides.password ?? 'test-password-1234',
      ),
      phoneVisibility: overrides.phoneVisibility ?? 'nobody',
      status: overrides.status ?? 'active',
    })
    .returning()

  if (!row) throw new Error('Failed to create test user')
  return { id: row.id, name: row.name, phone: phone.e164 }
}

export async function createTestBank(
  overrides: { name?: string; code?: string; isActive?: boolean } = {},
): Promise<{ id: string; name: string; code: string }> {
  const code = overrides.code ?? `BANK${randomUUID().slice(0, 6).toUpperCase()}`
  const [row] = await db
    .insert(banks)
    .values({
      name: overrides.name ?? `Test Bank ${code}`,
      code,
      isActive: overrides.isActive ?? true,
    })
    .returning()

  if (!row) throw new Error('Failed to create test bank')
  return { id: row.id, name: row.name, code: row.code }
}

export async function createTestProduct(input: {
  bankId: string
  cardType?: CardType
  name?: string
  isVerified?: boolean
  createdBy?: string
}): Promise<{ id: string; name: string }> {
  const name = input.name ?? `Test Product ${randomUUID().slice(0, 8)}`

  const [row] = await db
    .insert(cardProducts)
    .values({
      bankId: input.bankId,
      cardType: input.cardType ?? 'credit',
      name,
      slug: productSlug(name),
      isVerified: input.isVerified ?? true,
      createdBy: input.createdBy ?? null,
    })
    .returning({ id: cardProducts.id, name: cardProducts.name })

  if (!row) throw new Error('Failed to create test product')
  return row
}

export async function createTestCard(input: {
  ownerId: string
  bankId: string
  productId?: string
  productName?: string
  cardType?: CardType
  network?: CardNetwork
  bin?: string
  discoverability?: Discoverability
  binVisibility?: FieldVisibility
}): Promise<{ id: string; productId: string }> {
  const cardType = input.cardType ?? 'credit'

  const productId =
    input.productId ??
    (
      await createTestProduct({
        bankId: input.bankId,
        cardType,
        name: input.productName,
      })
    ).id

  const [row] = await db
    .insert(cards)
    .values({
      ownerId: input.ownerId,
      productId,
      network: input.network ?? 'visa',
      bin: input.bin ?? '540123',
      binVisibility: input.binVisibility ?? 'friends',
      discoverability: input.discoverability ?? 'everyone',
    })
    .returning()

  if (!row) throw new Error('Failed to create test card')
  return { id: row.id, productId }
}

export async function makeFriends(userA: string, userB: string): Promise<void> {
  await db.insert(friendships).values({
    requesterId: userA,
    recipientId: userB,
    status: 'accepted',
    acceptedAt: new Date(),
  })
}

export async function makePendingRequest(
  from: string,
  to: string,
): Promise<string> {
  const [row] = await db
    .insert(friendships)
    .values({ requesterId: from, recipientId: to, status: 'pending' })
    .returning({ id: friendships.id })
  if (!row) throw new Error('Failed to create pending request')
  return row.id
}

export async function blockUserDirect(
  blocker: string,
  blocked: string,
): Promise<void> {
  await db.insert(blocks).values({ blockerId: blocker, blockedId: blocked })
}
