import { describe, expect, it } from 'vitest'
import { db } from '@/db'
import { friendships } from '@/db/schema'
import { consumeRateLimit } from '@/server/common/rate-limit'
import {
  acceptFriendRequest,
  blockUser,
  rejectFriendRequest,
  sendFriendRequest,
} from '@/server/modules/friends/service'
import { getUserProfile, searchUserByPhone } from '@/server/modules/users/service'
import {
  blockUserDirect,
  createTestBank,
  createTestCard,
  createTestUser,
  makeFriends,
  makePendingRequest,
} from '../helpers/factory'

describe('Friend request rules', () => {
  it('refuses a request to yourself', async () => {
    const user = await createTestUser()
    await expect(sendFriendRequest(user.id, user.id)).rejects.toThrow(
      /cannot send yourself/i,
    )
  })

  it('refuses a duplicate pending request', async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    await sendFriendRequest(a.id, b.id)

    await expect(sendFriendRequest(a.id, b.id)).rejects.toThrow(
      /already pending/i,
    )
  })

  it('treats a reverse request as mutual consent and accepts', async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    await sendFriendRequest(a.id, b.id)

    const result = await sendFriendRequest(b.id, a.id)
    expect(result.status).toBe('accepted')

    const rows = await db.select().from(friendships)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('accepted')
  })

  it('refuses a request to a blocked user without revealing the block', async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    await blockUserDirect(b.id, a.id)

    // "not found", never "you are blocked".
    await expect(sendFriendRequest(a.id, b.id)).rejects.toThrow(/not found/i)
  })

  it('throttles a re-request after rejection', async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    const requestId = await makePendingRequest(a.id, b.id)
    await rejectFriendRequest(b.id, requestId)

    await expect(sendFriendRequest(a.id, b.id)).rejects.toThrow(/declined/i)
  })

  it('does not let the sender accept their own request', async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    const requestId = await makePendingRequest(a.id, b.id)

    await expect(acceptFriendRequest(a.id, requestId)).rejects.toThrow(
      /not found/i,
    )
  })

  it('does not let an unrelated user accept someone else\'s request', async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    const outsider = await createTestUser()
    const requestId = await makePendingRequest(a.id, b.id)

    await expect(acceptFriendRequest(outsider.id, requestId)).rejects.toThrow(
      /not found/i,
    )
  })
})

describe('Blocking revokes access immediately', () => {
  it('destroys the friendship when a user blocks a friend', async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    await makeFriends(a.id, b.id)

    await blockUser(a.id, b.id)

    expect(await db.select().from(friendships)).toHaveLength(0)
  })

  it('invalidates a pending request on block', async () => {
    const a = await createTestUser()
    const b = await createTestUser()
    await makePendingRequest(b.id, a.id)

    await blockUser(a.id, b.id)

    expect(await db.select().from(friendships)).toHaveLength(0)
  })
})

describe('User search is enumeration-resistant', () => {
  it('finds a user only by their exact full number', async () => {
    const searcher = await createTestUser()
    await createTestUser({ name: 'Rahul', phone: '9876500011' })

    const found = await searchUserByPhone(searcher.id, '9876500011')
    expect(found?.name).toBe('Rahul')

    // A prefix must not match.
    expect(await searchUserByPhone(searcher.id, '987650001')).toBeNull()
    expect(await searchUserByPhone(searcher.id, '98765')).toBeNull()
  })

  it('normalises equivalent formats to the same user', async () => {
    const searcher = await createTestUser()
    await createTestUser({ name: 'Rahul', phone: '9876500022' })

    for (const form of [
      '9876500022',
      '+919876500022',
      '09876500022',
      '+91 98765 00022',
    ]) {
      expect((await searchUserByPhone(searcher.id, form))?.name).toBe('Rahul')
    }
  })

  it('returns null for an unregistered number', async () => {
    const searcher = await createTestUser()
    expect(await searchUserByPhone(searcher.id, '9999900000')).toBeNull()
  })

  it('hides blocked users from search entirely', async () => {
    const searcher = await createTestUser()
    const target = await createTestUser({ phone: '9876500033' })
    await blockUserDirect(target.id, searcher.id)

    expect(await searchUserByPhone(searcher.id, '9876500033')).toBeNull()
  })

  it('never returns the phone number or any credential in a result', async () => {
    const searcher = await createTestUser()
    await createTestUser({ name: 'Rahul', phone: '9876500044' })

    const result = await searchUserByPhone(searcher.id, '9876500044')
    const json = JSON.stringify(result)

    expect(json).not.toContain('9876500044')
    expect(json).not.toContain('passwordHash')
    expect(json).not.toContain('phoneHmac')
  })
})

describe('Profiles respect authorisation', () => {
  it('withholds the phone from a non-friend', async () => {
    const viewer = await createTestUser()
    const target = await createTestUser({ phoneVisibility: 'friends' })

    const profile = await getUserProfile(viewer.id, target.id)
    expect(profile.phone).toBeUndefined()
    expect(JSON.stringify(profile)).not.toContain(target.phone)
  })

  it('releases the phone to a friend who was opted in', async () => {
    const viewer = await createTestUser()
    const target = await createTestUser({ phoneVisibility: 'friends' })
    await makeFriends(viewer.id, target.id)

    const profile = await getUserProfile(viewer.id, target.id)
    expect(profile.phone?.e164).toBe(target.phone)
    expect(profile.phone?.verified).toBe(false)
  })

  it('withholds the phone from a friend who was not opted in', async () => {
    const viewer = await createTestUser()
    const target = await createTestUser({ phoneVisibility: 'nobody' })
    await makeFriends(viewer.id, target.id)

    const profile = await getUserProfile(viewer.id, target.id)
    expect(profile.phone).toBeUndefined()
  })

  it('refuses a blocked user\'s profile', async () => {
    const viewer = await createTestUser()
    const target = await createTestUser()
    await blockUserDirect(target.id, viewer.id)

    await expect(getUserProfile(viewer.id, target.id)).rejects.toThrow(
      /not found/i,
    )
  })

  it('counts only the cards the viewer could actually open', async () => {
    const viewer = await createTestUser()
    const target = await createTestUser()
    const bank = await createTestBank()

    await createTestCard({
      ownerId: target.id,
      bankId: bank.id,
      discoverability: 'everyone',
    })
    await createTestCard({
      ownerId: target.id,
      bankId: bank.id,
      discoverability: 'nobody',
    })

    const profile = await getUserProfile(viewer.id, target.id)
    expect(profile.totalCards).toBe(1)
  })
})

describe('Rate limiting', () => {
  it('blocks once the limit is exceeded and counts per identity', async () => {
    const results = []
    for (let i = 0; i < 22; i += 1) {
      results.push(await consumeRateLimit('userSearch', 'rate-test-user'))
    }

    // userSearch allows 20 per hour.
    expect(results.filter((r) => r.allowed)).toHaveLength(20)
    expect(results.at(-1)?.allowed).toBe(false)
    expect(results.at(-1)?.retryAfterSeconds).toBeGreaterThan(0)

    // A different caller is unaffected.
    expect((await consumeRateLimit('userSearch', 'other-user')).allowed).toBe(
      true,
    )
  })
})
