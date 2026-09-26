import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * CardCircle database schema.
 *
 * INVARIANT: this file contains no column for a full card number (PAN), CVV,
 * PIN, OTP, or net-banking credential, and never will. `tests/security/
 * schema-safety.test.ts` parses this schema and fails the build if a
 * prohibited column name is introduced.
 *
 * The only reversible secrets stored are phone numbers and card expiry
 * dates, both AES-256-GCM encrypted (see src/server/crypto/aead.ts).
 */

/** Postgres `bytea` <-> Node `Buffer`. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
  toDriver(value: Buffer): Buffer {
    return value
  },
  fromDriver(value: unknown): Buffer {
    // postgres.js hands back a Uint8Array; normalise to Buffer.
    return Buffer.isBuffer(value) ? value : Buffer.from(value as Uint8Array)
  },
})

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userStatusEnum = pgEnum('user_status', ['active', 'disabled'])

/**
 * Two values, not the PRD's three. `owner_only` and `nobody` produce
 * identical behaviour for every non-owner, and the owner always sees their
 * own data in full — so a third variant would be unreachable state.
 */
export const visibilityEnum = pgEnum('visibility', ['nobody', 'friends'])

export const cardTypeEnum = pgEnum('card_type', ['credit', 'debit'])

export const cardNetworkEnum = pgEnum('card_network', [
  'visa',
  'mastercard',
  'rupay',
  'amex',
])

/**
 * Who may find a card in discovery.
 *
 * Three values rather than a boolean, because the product needs three
 * distinct behaviours that `is_discoverable` cannot express:
 *   - `everyone` — any signed-in, non-blocked user sees the safe subset
 *     (bank, name, type, network, BIN, last 4, owner name). This is what
 *     makes the core flow work: find the card, THEN send a friend request.
 *   - `friends`  — only accepted friends see it in discovery at all.
 *   - `nobody`   — private; visible to the owner alone.
 *
 * Shared fields (expiry, phone) remain friends-only under every value.
 */
export const discoverabilityEnum = pgEnum('discoverability', [
  'nobody',
  'friends',
  'everyone',
])

/**
 * Who may see an individually-controllable field.
 *
 * Three values, unlike `visibility`, because BIN masking genuinely needs
 * "everyone": a user may be happy for any signed-in person to see their
 * card's BIN, or restrict it to friends, or hide it entirely and let their
 * card be known only as "Airtel Axis Credit Card".
 */
export const fieldVisibilityEnum = pgEnum('field_visibility', [
  'nobody',
  'friends',
  'everyone',
])

export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted',
  'rejected',
])

export const reportStatusEnum = pgEnum('report_status', [
  'open',
  'reviewed',
  'dismissed',
])

/** Security-relevant events. Adding a value requires adding a handler. */
export const auditActionEnum = pgEnum('audit_action', [
  'user_registered',
  'user_logged_in',
  'user_login_failed',
  'user_logged_out',
  'card_created',
  'card_updated',
  'card_deleted',
  'card_viewed',
  'card_sharing_updated',
  'friend_request_sent',
  'friend_request_accepted',
  'friend_request_rejected',
  'friend_removed',
  'user_blocked',
  'user_unblocked',
  'user_reported',
  'user_searched',
  'phone_revealed',
  'recovery_codes_generated',
  'password_reset',
  'account_deleted',
  'card_product_created',
  'phone_changed',
])

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),

    /** HMAC-SHA256(E.164). The lookup key. Never exposed to clients. */
    phoneHmac: bytea('phone_hmac').notNull(),
    /** AES-256-GCM(E.164). Decrypted only for authorised viewers. */
    phoneCt: bytea('phone_ct').notNull(),
    /** Cleartext, for masked display without decryption. e.g. "91". */
    phoneCountryCode: text('phone_country_code').notNull(),
    phoneLast4: text('phone_last4').notNull(),

    /** Argon2id encoded hash. Never exposed to clients. */
    passwordHash: text('password_hash').notNull(),

    /**
     * Always NULL in v1: this build has no OTP/SMS verification, so every
     * phone number is self-asserted. The column exists so verification can
     * be added later without a migration, and so the UI can badge numbers
     * as unverified today.
     */
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),

    phoneVisibility: visibilityEnum('phone_visibility')
      .notNull()
      .default('nobody'),

    avatarUrl: text('avatar_url'),
    status: userStatusEnum('status').notNull().default('active'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_phone_hmac_unique').on(table.phoneHmac),
    // Enforced in the database, not just in Zod: a bug in a future code path
    // must not be able to write a non-numeric fragment here.
    check('users_phone_last4_digits', sql`${table.phoneLast4} ~ '^[0-9]{4}$'`),
    check(
      'users_phone_cc_digits',
      sql`${table.phoneCountryCode} ~ '^[0-9]{1,4}$'`,
    ),
  ],
)

export const banks = pgTable(
  'banks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    logoUrl: text('logo_url'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex('banks_code_unique').on(table.code)],
)

/**
 * The catalogue of real card products.
 *
 * Cards reference a product instead of carrying a free-text nickname,
 * because the question this app answers names a product: an offer says "10%
 * on Airtel Axis", not "10% on whatever you call your card". Matching
 * nicknames would never answer it reliably.
 *
 * Seeded from a curated list (migration 0004) and extended by users through
 * the "Other" option. A user-added row is `isVerified: false` and carries
 * `createdBy`, so additions are attributable and reviewable — this table is
 * shared, and an unmoderated free-text field that every other user then sees
 * in a dropdown is an abuse vector.
 */
export const cardProducts = pgTable(
  'card_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bankId: uuid('bank_id')
      .notNull()
      .references(() => banks.id, { onDelete: 'cascade' }),
    cardType: cardTypeEnum('card_type').notNull(),

    /** Display name, e.g. "Airtel Axis Bank". */
    name: text('name').notNull(),
    /**
     * Canonical key for uniqueness. See product-slug.ts — it spells out `+`
     * so "Power" and "Power+" stay distinct.
     */
    slug: text('slug').notNull(),

    /**
     * The issuer's own page for this card.
     *
     * Presentation data in the strict sense — nobody's card depends on it —
     * but it lives here rather than in code because members supply it for
     * the products they add, so it is per-row data and not a lookup table.
     *
     * NULL is normal: most of the catalogue has no confirmed page, and those
     * cards fall back to the bank's card list (src/lib/bank-links.ts). The
     * host is checked against the bank's own domains before a value is
     * written; see isAllowedCardUrl.
     */
    productUrl: text('product_url'),

    /** False for anything a user added via "Other", until reviewed. */
    isVerified: boolean('is_verified').notNull().default(false),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('card_products_unique').on(
      table.bankId,
      table.cardType,
      table.slug,
    ),
    // The picker's query: products for one bank and card type.
    index('card_products_bank_type_idx').on(table.bankId, table.cardType),
    // Cross-bank product search on the home page.
    index('card_products_slug_idx').on(sql`${table.slug} text_pattern_ops`),
    // https only, in the database. The per-bank host allowlist needs the
    // bank's code and so stays in the application; this is the floor.
    check(
      'card_products_url_https',
      sql`${table.productUrl} IS NULL OR ${table.productUrl} LIKE 'https://%'`,
    ),
  ],
)

export const cards = pgTable(
  'cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /**
     * The product this card is. Bank and card type are read from here rather
     * than duplicated onto the card, so the two can never disagree.
     */
    productId: uuid('product_id')
      .notNull()
      .references(() => cardProducts.id, { onDelete: 'restrict' }),

    /**
     * Network stays on the card, not the product: the same product is issued
     * on different networks (SBI SimplyCLICK comes as Visa and Mastercard).
     */
    network: cardNetworkEnum('network').notNull(),

    /**
     * First six digits. Identifies the issuing product, not the account.
     *
     * `text` rather than `char(6)`: bpchar pads with spaces on comparison,
     * which silently breaks exact BIN matching, and it rejects the
     * text_pattern_ops operator class needed for indexed prefix search. The
     * CHECK constraint enforces length and digits instead — which char(6)
     * never did, since it would happily store 'abcdef'.
     */
    bin: text('bin').notNull(),

    /**
     * Who may see the BIN. Defaults to friends: the product name alone
     * answers most offer questions, so the digits are opt-in rather than
     * shared by default.
     */
    binVisibility: fieldVisibilityEnum('bin_visibility')
      .notNull()
      .default('friends'),

    discoverability: discoverabilityEnum('discoverability')
      .notNull()
      .default('everyone'),
    ...timestamps,
  },
  (table) => [
    index('cards_owner_idx').on(table.ownerId),
    index('cards_product_idx').on(table.productId),
    index('cards_network_idx').on(table.network),
    index('cards_discoverability_idx').on(table.discoverability),
    index('cards_bin_idx').on(sql`${table.bin} text_pattern_ops`),
    check('cards_bin_digits', sql`${table.bin} ~ '^[0-9]{6}$'`),
  ],
)

export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: friendshipStatusEnum('status').notNull().default('pending'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    /**
     * Uniqueness on the UNORDERED pair.
     *
     * A plain UNIQUE(requester_id, recipient_id) would happily allow both
     * A->B pending and B->A pending to exist at once, producing two
     * conflicting relationships between the same two people. Indexing on
     * (least, greatest) collapses both directions to one key.
     */
    uniqueIndex('friendships_pair_unique').on(
      sql`least(${table.requesterId}, ${table.recipientId})`,
      sql`greatest(${table.requesterId}, ${table.recipientId})`,
    ),
    index('friendships_recipient_status_idx').on(
      table.recipientId,
      table.status,
    ),
    index('friendships_requester_status_idx').on(
      table.requesterId,
      table.status,
    ),
  ],
)

/**
 * Blocking is directional and independent of friendship.
 *
 * Kept out of friendship.status so that (a) we know who blocked whom, and
 * (b) mutual blocks are representable.
 */
export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    uniqueIndex('blocks_pair_unique').on(table.blockerId, table.blockedId),
    // "who has blocked me" — needed on every authorisation check.
    index('blocks_blocked_idx').on(table.blockedId),
  ],
)

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportedUserId: uuid('reported_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    details: text('details'),
    status: reportStatusEnum('status').notNull().default('open'),
    ...timestamps,
  },
  (table) => [index('reports_reported_idx').on(table.reportedUserId)],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 of the bearer token. The token itself is never stored. */
    tokenSha256: bytea('token_sha256').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    uniqueIndex('sessions_token_unique').on(table.tokenSha256),
    index('sessions_user_idx').on(table.userId),
  ],
)

/**
 * Single-use recovery codes.
 *
 * This build has no OTP and no email, so there is no channel over which to
 * send a reset link — which left a forgotten password as a permanent
 * lockout, fixable only by hand-editing the database.
 *
 * Codes are generated once at sign-up, shown once, and never recoverable
 * afterwards. Only SHA-256 of each is stored: a recovery code is a
 * credential that resets a password, so a database dump must not yield a
 * working one. A plain hash is right here (rather than Argon2) because the
 * codes are ~60 bits of uniform randomness — there is no dictionary to
 * attack — and the same reasoning as session tokens applies.
 */
export const recoveryCodes = pgTable(
  'recovery_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeSha256: bytea('code_sha256').notNull(),
    /** Set the moment a code is spent. Codes are strictly single-use. */
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    uniqueIndex('recovery_codes_user_code_unique').on(
      table.userId,
      table.codeSha256,
    ),
    index('recovery_codes_user_idx').on(table.userId),
  ],
)

/**
 * Fixed-window rate limiting.
 *
 * Lives in Postgres because Vercel's serverless functions share no memory —
 * an in-process counter would reset on every cold start and be per-instance
 * besides. Swappable for Redis behind the same interface if volume demands.
 */
export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.windowStart] }),
    index('rate_limits_window_idx').on(table.windowStart),
  ],
)

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    targetUserId: uuid('target_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: auditActionEnum('action').notNull(),
    resourceType: text('resource_type'),
    resourceId: uuid('resource_id'),
    /**
     * Non-sensitive context only. Writes go through recordAuditEvent(),
     * which strips prohibited keys; a security test asserts no card or
     * credential material can reach this column.
     */
    metadata: jsonb('metadata'),
    createdAt: timestamps.createdAt,
  },
  (table) => [
    index('audit_actor_created_idx').on(table.actorUserId, table.createdAt),
    index('audit_resource_idx').on(table.resourceType, table.resourceId),
  ],
)

/** Login attempt counters live in rate_limits; see src/server/common/rate-limit.ts. */
export const schema = {
  users,
  cardProducts,
  recoveryCodes,
  banks,
  cards,
  friendships,
  blocks,
  reports,
  sessions,
  rateLimits,
  auditLogs,
}

export type UserRow = typeof users.$inferSelect
export type BankRow = typeof banks.$inferSelect
export type CardRow = typeof cards.$inferSelect
export type CardProductRow = typeof cardProducts.$inferSelect
export type FriendshipRow = typeof friendships.$inferSelect
export type SessionRow = typeof sessions.$inferSelect
export type RecoveryCodeRow = typeof recoveryCodes.$inferSelect

export type CardType = (typeof cardTypeEnum.enumValues)[number]
export type CardNetwork = (typeof cardNetworkEnum.enumValues)[number]
export type Visibility = (typeof visibilityEnum.enumValues)[number]
export type FieldVisibility = (typeof fieldVisibilityEnum.enumValues)[number]
export type FriendshipStatus = (typeof friendshipStatusEnum.enumValues)[number]
export type Discoverability = (typeof discoverabilityEnum.enumValues)[number]
export type AuditAction = (typeof auditActionEnum.enumValues)[number]
