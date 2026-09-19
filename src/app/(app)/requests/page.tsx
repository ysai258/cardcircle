import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { RequestsPanel } from '@/components/RequestsPanel'
import { getCurrentUser } from '@/server/modules/auth/session'
import {
  listIncomingRequests,
  listOutgoingRequests,
} from '@/server/modules/friends/service'

export const metadata: Metadata = { title: 'Requests — CardCircle' }
export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [incoming, outgoing] = await Promise.all([
    listIncomingRequests(user.id),
    listOutgoingRequests(user.id),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Friend requests</h1>
      <RequestsPanel incoming={incoming} outgoing={outgoing} />
    </div>
  )
}
