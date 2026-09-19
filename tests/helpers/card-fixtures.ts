import type { CardRow } from '@/db/schema'
import type {
  CardOwnerInput,
  CardViewDeps,
} from '@/server/modules/cards/authorization'
import type { BankDTO } from '@/server/modules/cards/dto'

/**
 * Fixtures for the pure authorisation tests.
 *
 * Deliberately plain objects: the resolver takes no database handle, so
 * these tests need no database, no migrations and no cleanup.
 */

export const HDFC: BankDTO = {
  id: 'bank-hdfc',
  name: 'HDFC Bank',
  code: 'HDFC',
  logoUrl: null,
}

/** Sentinels. If either string appears in a response it came from decryption. */
export const DECRYPTED_EXPIRY = '08/29'
export const DECRYPTED_PHONE = '+919876543210'

export const deps: CardViewDeps = {
  decryptExpiry: () => DECRYPTED_EXPIRY,
  decryptPhone: () => DECRYPTED_PHONE,
  maskPhone: (cc, last4) => `+${cc} ••••••${last4}`,
}

/**
 * Deps that throw on any decryption.
 *
 * Used to prove the resolver is lazy: on an unauthorised branch it must
 * never even attempt to decrypt a value it is not going to release.
 */
export const explodingDeps: CardViewDeps = {
  decryptExpiry: () => {
    throw new Error('decryptExpiry must not be called on this branch')
  },
  decryptPhone: () => {
    throw new Error('decryptPhone must not be called on this branch')
  },
  maskPhone: () => {
    throw new Error('maskPhone must not be called on this branch')
  },
}

export function makeOwner(
  overrides: Partial<CardOwnerInput> = {},
): CardOwnerInput {
  return {
    id: 'user-rahul',
    name: 'Rahul',
    status: 'active',
    phoneVisibility: 'nobody',
    phoneCt: Buffer.from('encrypted-phone'),
    phoneCountryCode: '91',
    phoneLast4: '3210',
    phoneVerifiedAt: null,
    ...overrides,
  }
}

export function makeCard(overrides: Partial<CardRow> = {}): CardRow {
  return {
    id: 'card-123',
    ownerId: 'user-rahul',
    bankId: 'bank-hdfc',
    nickname: 'Millennia',
    variant: null,
    cardType: 'credit',
    network: 'visa',
    bin: '540123',
    last4: '1234',
    expiryCt: Buffer.from('encrypted-expiry'),
    discoverability: 'everyone',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}
