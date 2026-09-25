import 'server-only'
import { and, asc, count, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  banks,
  cardProducts,
  cards,
  type CardType,
  type Discoverability,
  type FieldVisibility,
  users,
} from '@/db/schema'
import { notFound, validationFailed } from '@/server/common/errors'
import { enforceRateLimit } from '@/server/common/rate-limit'
import { decryptPhone, maskPhone } from '@/server/crypto/phone'
import { recordAuditEvent } from '@/server/modules/audit/service'
import { getRelationship } from '@/server/modules/friends/repository'
import { buildCardView, type CardViewDeps } from './authorization'
import {
  binVisibleToRequester,
  discoverableByRequester,
  matchesText,
} from './discovery-predicate'
import type { BankDTO, CardSummaryDTO, CardView, OwnCardDTO, ProductDTO } from './dto'
import { normalizeProductName, productSlug } from './product-slug'
import type { CardFilters, CreateCardInput, UpdateCardInput } from './validation'

/** Real decryption, injected into the pure resolver. */
const viewDeps: CardViewDeps = { decryptPhone, maskPhone }

function toBankDTO(row: {
  id: string
  name: string
  code: string
  logoUrl: string | null
}): BankDTO {
  return { id: row.id, name: row.name, code: row.code, logoUrl: row.logoUrl }
}

function toProductDTO(row: {
  id: string
  name: string
  isVerified: boolean
}): ProductDTO {
  return { id: row.id, name: row.name, isVerified: row.isVerified }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type ProductOption = ProductDTO & { cardType: CardType }

/** The picker's list: every product this bank issues of this card type. */
export async function listProducts(
  bankId: string,
  cardType: CardType,
): Promise<ProductOption[]> {
  const rows = await db
    .select({
      id: cardProducts.id,
      name: cardProducts.name,
      isVerified: cardProducts.isVerified,
      cardType: cardProducts.cardType,
    })
    .from(cardProducts)
    .where(
      and(eq(cardProducts.bankId, bankId), eq(cardProducts.cardType, cardType)),
    )
    // Verified products first, then alphabetically: a user-submitted entry
    // should not outrank the real catalogue in the list.
    .orderBy(sql`${cardProducts.isVerified} DESC`, asc(cardProducts.name))

  return rows
}

/**
 * Resolves the "Other" option: finds an existing product or adds one.
 *
 * The new row becomes visible to every other user, which makes this the only
 * place in the app where one user writes content others will read. So:
 *
 *   - the name goes through the same PAN guard as every other free-text
 *     field, because "Other" is exactly where someone pastes a card number;
 *   - it is stored `isVerified: false` and attributed to its author, so an
 *     abusive entry is reviewable and traceable;
 *   - it is rate limited, so the catalogue cannot be flooded;
 *   - a matching slug returns the EXISTING row rather than creating a
 *     duplicate, so two people adding the same card converge on one product
 *     instead of splitting the answer to "who has this card".
 */
export async function findOrCreateProduct(input: {
  bankId: string
  cardType: CardType
  name: string
  userId: string
}): Promise<ProductDTO> {
  const name = normalizeProductName(input.name)
  const slug = productSlug(name)

  if (slug.length === 0) {
    throw validationFailed('Enter the card name', [
      { field: 'otherProductName', messages: ['Enter the card name'] },
    ])
  }

  const [existing] = await db
    .select({
      id: cardProducts.id,
      name: cardProducts.name,
      isVerified: cardProducts.isVerified,
    })
    .from(cardProducts)
    .where(
      and(
        eq(cardProducts.bankId, input.bankId),
        eq(cardProducts.cardType, input.cardType),
        eq(cardProducts.slug, slug),
      ),
    )
    .limit(1)

  if (existing) return toProductDTO(existing)

  await enforceRateLimit('productCreate', input.userId)

  const [created] = await db
    .insert(cardProducts)
    .values({
      bankId: input.bankId,
      cardType: input.cardType,
      name,
      slug,
      isVerified: false,
      createdBy: input.userId,
    })
    .onConflictDoNothing({
      target: [cardProducts.bankId, cardProducts.cardType, cardProducts.slug],
    })
    .returning({
      id: cardProducts.id,
      name: cardProducts.name,
      isVerified: cardProducts.isVerified,
    })

  if (created) {
    await recordAuditEvent({
      action: 'card_product_created',
      actorUserId: input.userId,
      resourceType: 'card_product',
      resourceId: created.id,
      metadata: { slug },
    })
    return toProductDTO(created)
  }

  // Lost a race with a concurrent insert of the same slug; read it back.
  const [raced] = await db
    .select({
      id: cardProducts.id,
      name: cardProducts.name,
      isVerified: cardProducts.isVerified,
    })
    .from(cardProducts)
    .where(
      and(
        eq(cardProducts.bankId, input.bankId),
        eq(cardProducts.cardType, input.cardType),
        eq(cardProducts.slug, slug),
      ),
    )
    .limit(1)

  if (!raced) throw new Error('Product insert returned no row')
  return toProductDTO(raced)
}

// ---------------------------------------------------------------------------
// Owner operations
// ---------------------------------------------------------------------------

async function loadOwnerInput(userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!row) throw notFound('User')
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    phoneVisibility: row.phoneVisibility,
    phoneCt: row.phoneCt,
    phoneCountryCode: row.phoneCountryCode,
    phoneLast4: row.phoneLast4,
    phoneVerifiedAt: row.phoneVerifiedAt,
  }
}

/** Resolves the product a create/update refers to, honouring "Other". */
async function resolveProduct(
  input: { bankId: string; cardType: CardType; productId?: string; otherProductName?: string | null },
  userId: string,
): Promise<{ id: string; cardType: CardType }> {
  if (input.otherProductName) {
    const product = await findOrCreateProduct({
      bankId: input.bankId,
      cardType: input.cardType,
      name: input.otherProductName,
      userId,
    })
    return { id: product.id, cardType: input.cardType }
  }

  if (!input.productId) {
    throw validationFailed('Choose a card', [
      { field: 'productId', messages: ['Choose a card'] },
    ])
  }

  // Verified against the chosen bank and type, so a crafted request cannot
  // attach an Axis product to an HDFC card.
  const [product] = await db
    .select({ id: cardProducts.id, cardType: cardProducts.cardType })
    .from(cardProducts)
    .where(
      and(
        eq(cardProducts.id, input.productId),
        eq(cardProducts.bankId, input.bankId),
        eq(cardProducts.cardType, input.cardType),
      ),
    )
    .limit(1)

  if (!product) {
    throw validationFailed('That card is not available for this bank', [
      { field: 'productId', messages: ['Choose a card from the list'] },
    ])
  }

  return product
}

export async function createCard(
  ownerId: string,
  input: CreateCardInput,
): Promise<OwnCardDTO> {
  const [bank] = await db
    .select()
    .from(banks)
    .where(and(eq(banks.id, input.bankId), eq(banks.isActive, true)))
    .limit(1)

  if (!bank) throw validationFailed('Select a valid bank')

  const product = await resolveProduct(input, ownerId)

  const [card] = await db
    .insert(cards)
    .values({
      ownerId,
      productId: product.id,
      network: input.network,
      bin: input.bin,
      binVisibility: input.binVisibility,
      discoverability: input.discoverability,
    })
    .returning()

  if (!card) throw new Error('Card insert returned no row')

  await recordAuditEvent({
    action: 'card_created',
    actorUserId: ownerId,
    resourceType: 'card',
    resourceId: card.id,
    // Bank and network only. Never the BIN.
    metadata: { bankCode: bank.code, network: card.network },
  })

  return getOwnCard(ownerId, card.id)
}

/**
 * Loads a card the caller owns.
 *
 * Ownership is part of the WHERE clause, not a check afterwards: another
 * user's card id simply matches no row, so update and delete cannot touch it
 * and cannot reveal that it exists.
 */
async function requireOwnedCard(ownerId: string, cardId: string) {
  const [row] = await db
    .select({ card: cards, product: cardProducts, bank: banks })
    .from(cards)
    .innerJoin(cardProducts, eq(cardProducts.id, cards.productId))
    .innerJoin(banks, eq(banks.id, cardProducts.bankId))
    .where(and(eq(cards.id, cardId), eq(cards.ownerId, ownerId)))
    .limit(1)

  if (!row) throw notFound('Card')
  return row
}

export async function getOwnCard(
  ownerId: string,
  cardId: string,
): Promise<OwnCardDTO> {
  const row = await requireOwnedCard(ownerId, cardId)

  const view = buildCardView(
    {
      requesterId: ownerId,
      card: row.card,
      bank: toBankDTO(row.bank),
      product: toProductDTO(row.product),
      cardType: row.product.cardType,
      owner: await loadOwnerInput(ownerId),
      relationship: 'self',
    },
    viewDeps,
  )

  if (view?.kind !== 'owner') throw notFound('Card')
  return view.card
}

export async function listOwnCards(ownerId: string): Promise<OwnCardDTO[]> {
  const rows = await db
    .select({ card: cards, product: cardProducts, bank: banks })
    .from(cards)
    .innerJoin(cardProducts, eq(cardProducts.id, cards.productId))
    .innerJoin(banks, eq(banks.id, cardProducts.bankId))
    .where(eq(cards.ownerId, ownerId))
    .orderBy(asc(banks.name), asc(cardProducts.name))

  const owner = await loadOwnerInput(ownerId)

  return rows.flatMap((row) => {
    const view = buildCardView(
      {
        requesterId: ownerId,
        card: row.card,
        bank: toBankDTO(row.bank),
        product: toProductDTO(row.product),
        cardType: row.product.cardType,
        owner,
        relationship: 'self',
      },
      viewDeps,
    )
    return view?.kind === 'owner' ? [view.card] : []
  })
}

export async function updateCard(
  ownerId: string,
  cardId: string,
  input: UpdateCardInput,
): Promise<OwnCardDTO> {
  const current = await requireOwnedCard(ownerId, cardId)

  let productId = current.card.productId

  // A product change has to re-validate against bank and type together.
  if (input.productId !== undefined || input.otherProductName) {
    const bankId = input.bankId ?? current.product.bankId
    const cardType = input.cardType ?? current.product.cardType
    const resolved = await resolveProduct(
      {
        bankId,
        cardType,
        productId: input.productId,
        otherProductName: input.otherProductName,
      },
      ownerId,
    )
    productId = resolved.id
  }

  await db
    .update(cards)
    .set({
      productId,
      ...(input.network !== undefined ? { network: input.network } : {}),
      ...(input.bin !== undefined ? { bin: input.bin } : {}),
      ...(input.binVisibility !== undefined
        ? { binVisibility: input.binVisibility }
        : {}),
      ...(input.discoverability !== undefined
        ? { discoverability: input.discoverability }
        : {}),
      updatedAt: new Date(),
    })
    // Ownership repeated so a race cannot widen the update.
    .where(and(eq(cards.id, cardId), eq(cards.ownerId, ownerId)))

  await recordAuditEvent({
    action: 'card_updated',
    actorUserId: ownerId,
    resourceType: 'card',
    resourceId: cardId,
    metadata: { fields: Object.keys(input).join(',') },
  })

  return getOwnCard(ownerId, cardId)
}

export async function updateSharing(
  ownerId: string,
  cardId: string,
  input: { discoverability?: Discoverability; binVisibility?: FieldVisibility },
): Promise<OwnCardDTO> {
  await requireOwnedCard(ownerId, cardId)

  await db
    .update(cards)
    .set({
      ...(input.discoverability !== undefined
        ? { discoverability: input.discoverability }
        : {}),
      ...(input.binVisibility !== undefined
        ? { binVisibility: input.binVisibility }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(cards.id, cardId), eq(cards.ownerId, ownerId)))

  await recordAuditEvent({
    action: 'card_sharing_updated',
    actorUserId: ownerId,
    resourceType: 'card',
    resourceId: cardId,
    metadata: {
      discoverability: input.discoverability ?? 'unchanged',
      binVisibility: input.binVisibility ?? 'unchanged',
    },
  })

  return getOwnCard(ownerId, cardId)
}

export async function deleteCard(
  ownerId: string,
  cardId: string,
): Promise<void> {
  const deleted = await db
    .delete(cards)
    .where(and(eq(cards.id, cardId), eq(cards.ownerId, ownerId)))
    .returning({ id: cards.id })

  if (deleted.length === 0) throw notFound('Card')

  await recordAuditEvent({
    action: 'card_deleted',
    actorUserId: ownerId,
    resourceType: 'card',
    resourceId: cardId,
  })
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export async function getCardDetail(
  requesterId: string,
  cardId: string,
): Promise<CardView> {
  const [row] = await db
    .select({
      card: cards,
      product: cardProducts,
      bank: banks,
      owner: users,
    })
    .from(cards)
    .innerJoin(cardProducts, eq(cardProducts.id, cards.productId))
    .innerJoin(banks, eq(banks.id, cardProducts.bankId))
    .innerJoin(users, eq(users.id, cards.ownerId))
    .where(eq(cards.id, cardId))
    .limit(1)

  if (!row) throw notFound('Card')

  const relationship = await getRelationship(requesterId, row.owner.id)

  const view = buildCardView(
    {
      requesterId,
      card: row.card,
      bank: toBankDTO(row.bank),
      product: toProductDTO(row.product),
      cardType: row.product.cardType,
      owner: {
        id: row.owner.id,
        name: row.owner.name,
        status: row.owner.status,
        phoneVisibility: row.owner.phoneVisibility,
        phoneCt: row.owner.phoneCt,
        phoneCountryCode: row.owner.phoneCountryCode,
        phoneLast4: row.owner.phoneLast4,
        phoneVerifiedAt: row.owner.phoneVerifiedAt,
      },
      relationship,
    },
    viewDeps,
  )

  // Indistinguishable from "no such card", by design.
  if (!view) throw notFound('Card')

  await recordAuditEvent({
    action: 'card_viewed',
    actorUserId: requesterId,
    targetUserId: row.owner.id,
    resourceType: 'card',
    resourceId: cardId,
    metadata: { relationship },
  })

  if (view.kind === 'visitor' && view.card.shared.phone) {
    await recordAuditEvent({
      action: 'phone_revealed',
      actorUserId: requesterId,
      targetUserId: row.owner.id,
      resourceType: 'user',
      resourceId: row.owner.id,
    })
  }

  return view
}

export type BankSummary = BankDTO & { cardCount: number }

export async function listBanksWithCounts(
  requesterId: string,
): Promise<BankSummary[]> {
  const rows = await db
    .select({
      id: banks.id,
      name: banks.name,
      code: banks.code,
      logoUrl: banks.logoUrl,
      cardCount: count(cards.id),
    })
    .from(banks)
    .innerJoin(cardProducts, eq(cardProducts.bankId, banks.id))
    .innerJoin(cards, eq(cards.productId, cardProducts.id))
    .innerJoin(users, eq(users.id, cards.ownerId))
    .where(and(eq(banks.isActive, true), discoverableByRequester(requesterId)))
    .groupBy(banks.id, banks.name, banks.code, banks.logoUrl)
    .orderBy(sql`count(${cards.id}) DESC`, asc(banks.name))

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    logoUrl: row.logoUrl,
    cardCount: Number(row.cardCount),
  }))
}

export type PaginatedCards = {
  items: CardSummaryDTO[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * The one query behind both the bank page and the home search.
 *
 * Filtering, matching and pagination all happen in SQL. The browser never
 * receives rows it then hides — that would be a disclosure, and it would not
 * scale past a few thousand cards.
 */
async function queryCards(
  requesterId: string,
  options: {
    bankId?: string
    cardType?: CardType
    network?: CardSummaryDTO['network']
    bin?: string
    text?: string
    page: number
    pageSize: number
  },
): Promise<PaginatedCards> {
  const conditions = [discoverableByRequester(requesterId)]

  if (options.bankId) conditions.push(eq(cardProducts.bankId, options.bankId))
  if (options.cardType) conditions.push(eq(cardProducts.cardType, options.cardType))
  if (options.network) conditions.push(eq(cards.network, options.network))

  if (options.bin) {
    // Gated on BIN visibility: a card whose BIN is hidden from this viewer
    // must not be findable BY that BIN, or search would reveal exactly what
    // masking hides.
    conditions.push(
      sql`(${cards.bin} LIKE ${`${options.bin}%`} AND ${binVisibleToRequester(requesterId)})`,
    )
  }

  if (options.text) conditions.push(matchesText(options.text))

  const where = and(...conditions)
  const offset = (options.page - 1) * options.pageSize

  const [totalRow] = await db
    .select({ total: count() })
    .from(cards)
    .innerJoin(cardProducts, eq(cardProducts.id, cards.productId))
    .innerJoin(banks, eq(banks.id, cardProducts.bankId))
    .innerJoin(users, eq(users.id, cards.ownerId))
    .where(where)

  const total = Number(totalRow?.total ?? 0)

  const rows = await db
    .select({
      card: cards,
      product: cardProducts,
      bank: banks,
      ownerId: users.id,
      ownerName: users.name,
      binVisible: binVisibleToRequester(requesterId),
    })
    .from(cards)
    .innerJoin(cardProducts, eq(cardProducts.id, cards.productId))
    .innerJoin(banks, eq(banks.id, cardProducts.bankId))
    .innerJoin(users, eq(users.id, cards.ownerId))
    .where(where)
    .orderBy(asc(cardProducts.name), asc(cards.id))
    .limit(options.pageSize)
    .offset(offset)

  const items: CardSummaryDTO[] = rows.map((row) => ({
    id: row.card.id,
    bank: toBankDTO(row.bank),
    product: toProductDTO(row.product),
    cardType: row.product.cardType,
    network: row.card.network,
    // Absent, not blanked, when the viewer may not see it.
    ...(row.binVisible ? { bin: row.card.bin } : {}),
    owner: { id: row.ownerId, name: row.ownerName },
  }))

  return {
    items,
    page: options.page,
    pageSize: options.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / options.pageSize)),
  }
}

export async function listCardsByBank(
  requesterId: string,
  bankId: string,
  filters: CardFilters,
): Promise<PaginatedCards> {
  return queryCards(requesterId, { ...filters, bankId })
}

/** Home-page search across every bank. */
export async function searchCards(
  requesterId: string,
  filters: CardFilters & { q?: string },
): Promise<PaginatedCards> {
  return queryCards(requesterId, { ...filters, text: filters.q })
}
