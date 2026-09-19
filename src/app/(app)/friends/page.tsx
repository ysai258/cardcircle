import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { FriendsPanel } from '@/components/FriendsPanel'
import { getCurrentUser } from '@/server/modules/auth/session'
import { listBlockedUsers, listFriends } from '@/server/modules/friends/service'

export const metadata: Metadata = { title: 'Friends — CardCircle' }
export const dynamic = 'force-dynamic'

export default async function FriendsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [friends, blocked] = await Promise.all([
    listFriends(user.id),
    listBlockedUsers(user.id),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">Friends</h1>
      <FriendsPanel friends={friends} blocked={blocked} />
    </div>
  )
}
