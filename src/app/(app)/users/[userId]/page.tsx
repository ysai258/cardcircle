import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { RelationshipBadge } from '@/components/FriendsPanel'
import { AppError } from '@/server/common/errors'
import { getCurrentUser } from '@/server/modules/auth/session'
import { getUserProfile } from '@/server/modules/users/service'

export const dynamic = 'force-dynamic'

/**
 * Another user's profile.
 *
 * Bank counts and the phone number both come from getUserProfile, which
 * applies the same authorisation as everywhere else. A non-friend simply
 * receives a profile with no `phone` key.
 */
export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const viewer = await getCurrentUser()
  if (!viewer) redirect('/login')

  const { userId } = await params

  let profile
  try {
    profile = await getUserProfile(viewer.id, userId)
  } catch (error) {
    // A blocked or non-existent user is the same 404, by design.
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound()
    throw error
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/friends"
          className="inline-flex min-h-9 items-center text-sm text-ink-muted transition-colors hover:text-ink hover:underline"
        >
          ← Friends
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-ink">{profile.name}</h1>
          <RelationshipBadge relationship={profile.relationship} />
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {profile.totalCards} card{profile.totalCards === 1 ? '' : 's'} you can
          see
        </p>
      </div>

      {profile.phone && (
        <section className="rounded-(--radius-card) border border-border-subtle bg-surface-raised p-5 shadow-card">
          <p className="text-xs text-ink-muted">Mobile number</p>
          <p className="numeric mt-0.5 text-sm font-medium text-ink">
            {profile.phone.e164}
          </p>
          {!profile.phone.verified && (
            <p className="mt-1 text-xs text-ink-faint">
              Not verified by CardCircle.
            </p>
          )}
          <a
            href={`tel:${profile.phone.e164}`}
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink hover:bg-accent-hover"
          >
            Call {profile.name}
          </a>
        </section>
      )}

      {!profile.phone && profile.relationship === 'friends' && (
        <p className="rounded-lg bg-surface-sunken px-3 py-2.5 text-sm text-ink-muted">
          {profile.name} hasn&apos;t shared their phone number.
        </p>
      )}

      <section>
        <h2 className="text-sm font-semibold text-ink">Cards by bank</h2>

        {profile.banks.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No cards you can see right now.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {profile.banks.map((bank) => (
              <li key={bank.id}>
                <Link
                  href={`/banks/${bank.id}`}
                  className="flex items-center justify-between gap-3 rounded-(--radius-card) border border-border-subtle bg-surface-raised px-4 py-3 shadow-card transition-colors hover:bg-surface-sunken"
                >
                  <span className="text-sm text-ink">{bank.name}</span>
                  <span className="text-sm text-ink-muted">
                    {bank.cardCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
