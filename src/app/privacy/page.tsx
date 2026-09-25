import Link from 'next/link'
import type { Metadata } from 'next'
import { AppFooter } from '@/components/AppFooter'

export const metadata: Metadata = { title: 'Privacy — CardCircle' }

/**
 * Outside both route groups: reachable whether or not you are signed in,
 * which is the point of a privacy page.
 */
export default function PrivacyPage() {
  return (
    <div className="flex h-dvh flex-col">
      <main className="app-scroll flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-10">
          <Link
            href="/"
            className="inline-flex min-h-9 items-center text-sm text-ink-muted transition-colors hover:text-ink"
          >
            ← CardCircle
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-ink">
            What CardCircle knows about you
          </h1>
          <p className="mt-2 text-ink-muted">
            Short version: which cards you hold, and nothing that could be used
            to spend money.
          </p>

          <section className="mt-8 space-y-6 text-sm leading-relaxed text-ink">
            <div>
              <h2 className="text-lg font-bold">Never stored, at all</h2>
              <p className="mt-2 text-ink-muted">
                Full card number, CVV, PIN, OTP, net-banking credentials,
                expiry date, last-4 digits. There is no database column for any
                of them, and an automated check fails the build if one is ever
                added.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold">Stored</h2>
              <ul className="mt-2 space-y-1.5 text-ink-muted">
                <li>
                  Your mobile number, encrypted, plus a keyed digest so friends
                  can find you by it.
                </li>
                <li>Your password, hashed with Argon2id. Never recoverable.</li>
                <li>
                  For each card: which card it is, its network, and the first
                  six digits — with your choice of who may see those digits.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold">You decide who sees what</h2>
              <p className="mt-2 text-ink-muted">
                Every card chooses who can discover it and who can see its
                first six digits. Hidden means the server never sends the
                digits — they are absent from the response, not blanked in the
                page — and the card cannot be found by searching them either.
                Your phone number is shared only if you switch it on.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold">Worth knowing</h2>
              <p className="mt-2 text-ink-muted">
                Mobile numbers are not verified — this build sends no OTP — so
                a number is only as trustworthy as the person who typed it.
                Deleting your account removes everything you own immediately.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold">Questions</h2>
              <p className="mt-2 text-ink-muted">
                Write to{' '}
                <a
                  href="mailto:ysaimuppineni789@gmail.com?subject=CardCircle%20privacy"
                  className="inline-flex min-h-9 items-center font-medium text-accent hover:underline"
                >
                  ysaimuppineni789@gmail.com
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  )
}
