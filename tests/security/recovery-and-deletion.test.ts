import { and, eq, isNull } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from '@/db'
import { auditLogs, cards, friendships, recoveryCodes, sessions, users } from '@/db/schema'
import { hashToken } from '@/server/crypto/tokens'
import {
  countUnusedCodes,
  issueRecoveryCodes,
  normalizeCode,
  regenerateRecoveryCodes,
  resetPasswordWithRecoveryCode,
} from '@/server/modules/auth/recovery'
import { verifyPassword } from '@/server/crypto/password'
import { getCardDetail, listCardsByBank } from '@/server/modules/cards/service'
import { deleteAccount } from '@/server/modules/users/service'
import {
  createTestBank,
  createTestCard,
  createTestUser,
  makeFriends,
} from '../helpers/factory'

const CLIENT = 'recovery-test-client'

async function userWithCodes(phone?: string) {
  const user = await createTestUser({ phone, password: 'original-password-1' })
  const codes = await issueRecoveryCodes(user.id)
  return { user, codes }
}

describe('Recovery codes', () => {
  it('issues codes that are stored hashed, never in plaintext', async () => {
    const { user, codes } = await userWithCodes()

    const rows = await db
      .select()
      .from(recoveryCodes)
      .where(eq(recoveryCodes.userId, user.id))

    expect(rows).toHaveLength(codes.length)

    // The stored value must be the hash, and the plaintext must appear nowhere.
    const stored = rows.map((row) => row.codeSha256.toString('hex'))
    expect(stored).toContain(hashToken(codes[0]!).toString('hex'))

    const dump = JSON.stringify(rows)
    for (const code of codes) {
      expect(dump).not.toContain(code)
    }
  })

  it('accepts a code however the user types it', async () => {
    const { user, codes } = await userWithCodes('9876511001')
    const code = codes[0]!

    // Lower case, spaces instead of dashes, stray whitespace.
    const messy = `  ${code.toLowerCase().replace(/-/g, ' ')}  `
    expect(normalizeCode(messy)).toBe(code)

    await resetPasswordWithRecoveryCode({
      phone: '9876511001',
      code: messy,
      newPassword: 'a-brand-new-password',
      clientId: CLIENT,
    })

    const [row] = await db
      .select({ hash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id))

    expect(await verifyPassword(row!.hash, 'a-brand-new-password')).toBe(true)
  })

  it('makes each code single-use', async () => {
    const { codes } = await userWithCodes('9876511002')
    const code = codes[0]!

    await resetPasswordWithRecoveryCode({
      phone: '9876511002',
      code,
      newPassword: 'first-new-password',
      clientId: CLIENT,
    })

    // The same code a second time must not work.
    await expect(
      resetPasswordWithRecoveryCode({
        phone: '9876511002',
        code,
        newPassword: 'second-new-password',
        clientId: CLIENT,
      }),
    ).rejects.toThrow(/not valid/i)
  })

  it('leaves the other codes usable after one is spent', async () => {
    const { user, codes } = await userWithCodes('9876511003')

    await resetPasswordWithRecoveryCode({
      phone: '9876511003',
      code: codes[0]!,
      newPassword: 'password-number-one',
      clientId: CLIENT,
    })

    expect(await countUnusedCodes(user.id)).toBe(codes.length - 1)

    await resetPasswordWithRecoveryCode({
      phone: '9876511003',
      code: codes[1]!,
      newPassword: 'password-number-two',
      clientId: CLIENT,
    })

    expect(await countUnusedCodes(user.id)).toBe(codes.length - 2)
  })

  it('rejects a wrong code with the same message as a wrong number', async () => {
    await userWithCodes('9876511004')

    // allSettled, not two bare promises: starting both and awaiting them in
    // sequence leaves the second rejection unhandled until the first assertion
    // finishes, which Node reports as an unhandled rejection.
    const [wrongCode, wrongPhone] = await Promise.allSettled([
      resetPasswordWithRecoveryCode({
        phone: '9876511004',
        code: 'ZZZZ-ZZZZ-ZZZZ',
        newPassword: 'attacker-password',
        clientId: CLIENT,
      }),
      resetPasswordWithRecoveryCode({
        phone: '9876599999',
        code: 'ZZZZ-ZZZZ-ZZZZ',
        newPassword: 'attacker-password',
        clientId: CLIENT,
      }),
    ])

    expect(wrongCode.status).toBe('rejected')
    expect(wrongPhone.status).toBe('rejected')

    // Byte-identical messages: a registered number must not be
    // distinguishable from an unregistered one.
    const messageOf = (r: PromiseSettledResult<void>): string =>
      r.status === 'rejected' ? (r.reason as Error).message : ''

    expect(messageOf(wrongCode)).toMatch(/not valid/i)
    expect(messageOf(wrongCode)).toBe(messageOf(wrongPhone))
  })

  it('does not accept another user\'s code', async () => {
    await userWithCodes('9876511005')
    const other = await userWithCodes('9876511006')

    await expect(
      resetPasswordWithRecoveryCode({
        phone: '9876511005',
        code: other.codes[0]!,
        newPassword: 'cross-account-password',
        clientId: CLIENT,
      }),
    ).rejects.toThrow(/not valid/i)
  })

  it('revokes every live session on reset', async () => {
    const { user, codes } = await userWithCodes('9876511007')

    await db.insert(sessions).values([
      {
        userId: user.id,
        tokenSha256: hashToken('session-token-a'),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
      {
        userId: user.id,
        tokenSha256: hashToken('session-token-b'),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    ])

    await resetPasswordWithRecoveryCode({
      phone: '9876511007',
      code: codes[0]!,
      newPassword: 'post-compromise-password',
      clientId: CLIENT,
    })

    const live = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt)))

    expect(live).toHaveLength(0)
  })

  it('invalidates the old set when codes are regenerated', async () => {
    const { user, codes } = await userWithCodes('9876511008')
    const oldCode = codes[0]!

    const fresh = await regenerateRecoveryCodes(user.id)

    expect(fresh).toHaveLength(codes.length)
    expect(fresh).not.toContain(oldCode)

    await expect(
      resetPasswordWithRecoveryCode({
        phone: '9876511008',
        code: oldCode,
        newPassword: 'should-not-work',
        clientId: CLIENT,
      }),
    ).rejects.toThrow(/not valid/i)

    // ...but a new one does.
    await resetPasswordWithRecoveryCode({
      phone: '9876511008',
      code: fresh[0]!,
      newPassword: 'this-one-works-fine',
      clientId: CLIENT,
    })
  })

  it('refuses to reset a disabled account', async () => {
    const user = await createTestUser({
      phone: '9876511009',
      status: 'disabled',
    })
    const codes = await issueRecoveryCodes(user.id)

    await expect(
      resetPasswordWithRecoveryCode({
        phone: '9876511009',
        code: codes[0]!,
        newPassword: 'disabled-account-password',
        clientId: CLIENT,
      }),
    ).rejects.toThrow(/not valid/i)
  })

  it('generates distinct, well-formed codes', async () => {
    const { codes } = await userWithCodes()

    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/)
      // Ambiguous characters must not appear at all.
      expect(code).not.toMatch(/[ILOU]/)
    }
  })
})

describe('Account deletion', () => {
  it('requires the correct password', async () => {
    const user = await createTestUser({ password: 'correct-password-99' })

    await expect(deleteAccount(user.id, 'wrong-password-99')).rejects.toThrow(
      /not correct/i,
    )

    const still = await db.select().from(users).where(eq(users.id, user.id))
    expect(still).toHaveLength(1)
  })

  it('removes the account and everything it owns', async () => {
    const user = await createTestUser({ password: 'delete-me-please-1' })
    const friend = await createTestUser()
    const bank = await createTestBank()

    await createTestCard({ ownerId: user.id, bankId: bank.id })
    await makeFriends(user.id, friend.id)
    await issueRecoveryCodes(user.id)
    await db.insert(sessions).values({
      userId: user.id,
      tokenSha256: hashToken('a-live-session'),
      expiresAt: new Date(Date.now() + 86_400_000),
    })

    await deleteAccount(user.id, 'delete-me-please-1')

    expect(await db.select().from(users).where(eq(users.id, user.id))).toHaveLength(0)
    expect(await db.select().from(cards).where(eq(cards.ownerId, user.id))).toHaveLength(0)
    expect(
      await db.select().from(recoveryCodes).where(eq(recoveryCodes.userId, user.id)),
    ).toHaveLength(0)
    expect(
      await db.select().from(sessions).where(eq(sessions.userId, user.id)),
    ).toHaveLength(0)
    expect(
      await db
        .select()
        .from(friendships)
        .where(eq(friendships.requesterId, user.id)),
    ).toHaveLength(0)
  })

  it('removes the deleted user\'s cards from everyone else\'s discovery', async () => {
    const owner = await createTestUser({ password: 'going-away-soon-1' })
    const viewer = await createTestUser()
    const bank = await createTestBank()
    const card = await createTestCard({ ownerId: owner.id, bankId: bank.id })

    expect((await listCardsByBank(viewer.id, bank.id, { page: 1, pageSize: 20 })).total).toBe(1)

    await deleteAccount(owner.id, 'going-away-soon-1')

    expect((await listCardsByBank(viewer.id, bank.id, { page: 1, pageSize: 20 })).total).toBe(0)
    await expect(getCardDetail(viewer.id, card.id)).rejects.toThrow(/not found/i)
  })

  it('keeps the audit trail but detaches it from the deleted user', async () => {
    const user = await createTestUser({ password: 'audit-survives-01' })
    await deleteAccount(user.id, 'audit-survives-01')

    const deletionEvents = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'account_deleted'))

    expect(deletionEvents.length).toBeGreaterThan(0)
    // Retained as a security record, stripped of who it referred to.
    expect(deletionEvents[0]?.actorUserId).toBeNull()
  })
})
