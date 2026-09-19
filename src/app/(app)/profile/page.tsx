import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { AccountSecurity } from '@/components/AccountSecurity'
import { ProfileSettings } from '@/components/ProfileSettings'
import { getCurrentUser } from '@/server/modules/auth/session'
import { countUnusedCodes } from '@/server/modules/auth/recovery'
import { toMeDTO } from '@/server/modules/users/service'

export const metadata: Metadata = { title: 'Profile — CardCircle' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const remainingCodes = await countUnusedCodes(user.id)

  // toMeDTO returns the MASKED number, never the decrypted one.
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-ink">Profile</h1>
      <ProfileSettings me={toMeDTO(user)} />
      <AccountSecurity remainingCodes={remainingCodes} />
    </div>
  )
}
