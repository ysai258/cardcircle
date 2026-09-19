import 'server-only'
import { and, asc, count, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  banks,
  cards,
  cardSharingSettings,
  type CardField,
  users,
  type Visibility,
} from '@/db/schema'
import { notFound, validationFailed } from '@/server/common/errors'
import { decrypt, encrypt } from '@/server/crypto/aead'
import { decryptPhone, maskPhone } from '@/server/crypto/phone'
import { recordAuditEvent } from '@/server/modules/audit/service'
import { getRelationship } from '@/server/modules/friends/repository'
import { buildCardView, type CardViewDeps } from './authorization'
import { discoverableByRequester } from './discovery-predicate'
import type {
  BankDTO,
  CardSummaryDTO,
  CardView,
  OwnCardDTO,
} from './dto'
import type {
  CardFilters,
  CreateCardInput,
  UpdateCardInput,
} from './validation'

/**
 * Card service.
 *
 * Reads and writes cards, and is the only caller of buildCardView(). No
 * route handler and no React component decides visibility.
 */

/** Real decryption, injected into the pure resolver. */
const viewDeps: CardViewDeps = {
  decryptExpiry: (blob) => decrypt('expiry-enc-v1', blob),
  decryptPhone,
  maskPhone,
}

function toBankDTO(row: {
  id: string
  name: string
  code: string
  logoUrl: string | null
}): BankDTO {
  return { id: row.id, name: row.name, code: row.code, logoUrl: row.logoUrl }
}

async function loadSharing(
  cardId: string,
): Promise<ReadonlyMap<CardField, Visibility>> {
  const rows = await db
    .select({
      fieldName: cardSharingSettings.fieldName,
      visibility: cardSharingSettings.visibility,
    })
    .from(cardSharingSettings)
    .where(eq(cardSharingSettings.cardId, cardId))

  return new Map(rows.map((row) => [row.fieldName, row.visibility]))
}

// ---------------------------------------------------------------------------
// Owner operations
// ---------------------------------------------------------------------------

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

  const card = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(cards)
      .values({
        ownerId,
        bankId: input.bankId,
        nickname: input.nickname,
        variant: input.variant ?? null,
        cardType: input.cardType,
        network: input.network,
        bin: input.bin,
        last4: input.last4,
        expiryCt: input.expiry ? encrypt('expiry-enc-v1', input.expiry) : null,
        discoverability: input.discoverability,
      })
      .returning()

    if (!created) throw new Error('Card insert returned no row')

    await tx.insert(cardSharingSettings).values({
      cardId: created.id,
      fieldName: 'expiry',
      visibility: input.expiryVisibility,
    })

    return created
  })

  await recordAuditEvent({
    action: 'card_created',
    actorUserId: ownerId,
    resourceType: 'card',
    resourceId: card.id,
    // Bank and network only. Never the BIN, last 4, or expiry.
    metadata: { bankCode: bank.code, network: card.network },
  })

  const view = buildCardView(
    {
      requesterId: ownerId,
      card,
      bank: toBankDTO(bank),
      owner: await loadOwnerInput(ownerId),
      relationship: 'self',
      sharing: new Map([['expiry', input.expiryVisibility]]),
    },
    viewDeps,
  )

  if (view?.kind !== 'owner') throw new Error('Expected owner view')
  return view.card
}

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

/**
 * Loads a card the caller owns.
 *
 * Ownership is part of the WHERE clause, not a check afterwards: another
 * user's card id simply matches no row, so update and delete cannot touch
 * it and cannot tell the caller it exists.
 */
async function requireOwnedCard(ownerId: string, cardId: string) {
  const [row] = await db
    .select({ card: cards, bank: banks })
    .from(cards)
    .innerJoin(banks, eq(banks.id, cards.bankId))
    .where(and(eq(cards.id, cardId), eq(cards.ownerId, ownerId)))
    .limit(1)

  if (!row) throw notFound('Card')
  return row
}

export async function listOwnCards(ownerId: string): Promise<OwnCardDTO[]> {
  const rows = await db
    .select({ card: cards, bank: banks })
    .from(cards)
    .innerJoin(banks, eq(banks.id, cards.bankId))
    .where(eq(cards.ownerId, ownerId))
    .orderBy(asc(banks.name), asc(cards.nickname))

  const owner = await loadOwnerInput(ownerId)
  const sharingRows = await db
    .select({
      cardId: cardSharingSettings.cardId,
      fieldName: cardSharingSettings.fieldName,
      visibility: cardSharingSettings.visibility,
    })
    .from(cardSharingSettings)
    .innerJoin(cards, eq(cards.id, cardSharingSettings.cardId))
    .where(eq(cards.ownerId, ownerId))

  const sharingByCard = new Map<string, Map<CardField, Visibility>>()
  for (const row of sharingRows) {
    const existing = sharingByCard.get(row.cardId) ?? new Map()
    existing.set(row.fieldName, row.visibility)
    sharingByCard.set(row.cardId, existing)
  }

  return rows.flatMap((row) => {
    const view = buildCardView(
      {
        requesterId: ownerId,
        card: row.card,
        bank: toBankDTO(row.bank),
        owner,
        relationship: 'self',
        sharing: sharingByCard.get(row.card.id) ?? new Map(),
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
  await requireOwnedCard(ownerId, cardId)

  if (input.bankId !== undefined) {
    const [bank] = await db
      .select({ id: banks.id })
      .from(banks)
      .where(and(eq(banks.id, input.bankId), eq(banks.isActive, true)))
      .limit(1)
    if (!bank) throw validationFailed('Select a valid bank')
  }

  await db.transaction(async (tx) => {
    await tx
      .update(cards)
      .set({
        ...(input.bankId !== undefined ? { bankId: input.bankId } : {}),
        ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
        ...(input.variant !== undefined ? { variant: input.variant ?? null } : {}),
        ...(input.cardType !== undefined ? { cardType: input.cardType } : {}),
        ...(input.network !== undefined ? { network: input.network } : {}),
        ...(input.bin !== undefined ? { bin: input.bin } : {}),
        ...(input.last4 !== undefined ? { last4: input.last4 } : {}),
        ...(input.expiry !== undefined
          ? {
              expiryCt: input.expiry
                ? encrypt('expiry-enc-v1', input.expiry)
                : null,
            }
          : {}),
        ...(input.discoverability !== undefined
          ? { discoverability: input.discoverability }
          : {}),
        updatedAt: new Date(),
      })
      // Ownership repeated here so a race cannot widen the update.
      .where(and(eq(cards.id, cardId), eq(cards.ownerId, ownerId)))

    if (input.expiryVisibility !== undefined) {
      await tx
        .insert(cardSharingSettings)
        .values({
          cardId,
          fieldName: 'expiry',
          visibility: input.expiryVisibility,
        })
        .onConflictDoUpdate({
          target: [cardSharingSettings.cardId, cardSharingSettings.fieldName],
          set: { visibility: input.expiryVisibility, updatedAt: new Date() },
        })
    }
  })

  await recordAuditEvent({
    action: 'card_updated',
    actorUserId: ownerId,
    resourceType: 'card',
    resourceId: cardId,
    metadata: { fields: Object.keys(input).join(',') },
  })

  const view = await getOwnCard(ownerId, cardId)
  return view
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
      owner: await loadOwnerInput(ownerId),
      relationship: 'self',
      sharing: await loadSharing(cardId),
    },
    viewDeps,
  )

  if (view?.kind !== 'owner') throw notFound('Card')
  return view.card
}

export async function updateSharing(
  ownerId: string,
  cardId: string,
  input: { discoverability?: 'nobody' | 'friends' | 'everyone'; expiryVisibility?: Visibility },
): Promise<OwnCardDTO> {
  await requireOwnedCard(ownerId, cardId)

  await db.transaction(async (tx) => {
    if (input.discoverability !== undefined) {
      await tx
        .update(cards)
        .set({ discoverability: input.discoverability, updatedAt: new Date() })
        .where(and(eq(cards.id, cardId), eq(cards.ownerId, ownerId)))
    }

    if (input.expiryVisibility !== undefined) {
      await tx
        .insert(cardSharingSettings)
        .values({
          cardId,
          fieldName: 'expiry',
          visibility: input.expiryVisibility,
        })
        .onConflictDoUpdate({
          target: [cardSharingSettings.cardId, cardSharingSettings.fieldName],
          set: { visibility: input.expiryVisibility, updatedAt: new Date() },
        })
    }
  })

  await recordAuditEvent({
    action: 'card_sharing_updated',
    actorUserId: ownerId,
    resourceType: 'card',
    resourceId: cardId,
    metadata: {
      discoverability: input.discoverability ?? 'unchanged',
      expiryVisibility: input.expiryVisibility ?? 'unchanged',
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

/**
 * Card detail for any requester.
 *
 * Loads the card without an authorisation filter, then hands everything to
 * buildCardView. That is deliberate: a single resolver making the decision
 * with full context is easier to audit than an authorisation-shaped WHERE
 * clause that must be re-derived correctly at every call site. The row never
 * leaves this function — only the resolver's DTO does.
 */
export async function getCardDetail(
  requesterId: string,
  cardId: string,
): Promise<CardView> {
  const [row] = await db
    .select({ card: cards, bank: banks, owner: users })
    .from(cards)
    .innerJoin(banks, eq(banks.id, cards.bankId))
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
      sharing: await loadSharing(cardId),
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

/**
 * Home screen: banks with the number of cards this user may actually see.
 *
 * The count uses the same predicate as the listing, so it can never advertise
 * cards the bank page will not show.
 */
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
    .innerJoin(cards, eq(cards.bankId, banks.id))
    .innerJoin(users, eq(users.id, cards.ownerId))
    .where(
      and(eq(banks.isActive, true), discoverableByRequester(requesterId)),
    )
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
 * Bank page listing.
 *
 * Filtering, BIN prefix matching and pagination all happen in SQL. The
 * browser never receives rows it then hides — both because that would be a
 * disclosure, and because it would not scale past a few thousand cards.
 *
 * Returns CardSummaryDTO, which structurally cannot carry expiry or phone.
 */
export async function listCardsByBank(
  requesterId: string,
  bankId: string,
  filters: CardFilters,
): Promise<PaginatedCards> {
  const conditions = [
    eq(cards.bankId, bankId),
    discoverableByRequester(requesterId),
  ]

  if (filters.cardType) conditions.push(eq(cards.cardType, filters.cardType))
  if (filters.network) conditions.push(eq(cards.network, filters.network))
  if (filters.bin) {
    // Prefix match, index-backed via cards_bank_bin_idx (text_pattern_ops).
    // The value is parameterised, and validated to 1-6 digits upstream.
    conditions.push(sql`${cards.bin} LIKE ${`${filters.bin}%`}`)
  }

  const where = and(...conditions)
  const offset = (filters.page - 1) * filters.pageSize

  const [totalRow] = await db
    .select({ total: count() })
    .from(cards)
    .innerJoin(users, eq(users.id, cards.ownerId))
    .where(where)

  const total = Number(totalRow?.total ?? 0)

  const rows = await db
    .select({
      card: cards,
      bank: banks,
      ownerId: users.id,
      ownerName: users.name,
    })
    .from(cards)
    .innerJoin(banks, eq(banks.id, cards.bankId))
    .innerJoin(users, eq(users.id, cards.ownerId))
    .where(where)
    .orderBy(asc(cards.nickname), asc(cards.id))
    .limit(filters.pageSize)
    .offset(offset)

  const items: CardSummaryDTO[] = rows.map((row) => ({
    id: row.card.id,
    bank: toBankDTO(row.bank),
    cardType: row.card.cardType,
    network: row.card.network,
    bin: row.card.bin,
    last4: row.card.last4,
    nickname: row.card.nickname,
    variant: row.card.variant,
    owner: { id: row.ownerId, name: row.ownerName },
  }))

  return {
    items,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
  }
}
