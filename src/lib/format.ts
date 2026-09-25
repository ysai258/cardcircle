/**
 * Deterministic date formatting.
 *
 * `toLocaleDateString(undefined, ...)` resolves to whatever locale and time
 * zone the runtime happens to have — the server's during rendering, the
 * browser's during hydration. Vercel's functions run in UTC and this app's
 * users are in IST, so a timestamp near midnight rendered as a different day
 * on each side and React threw a hydration mismatch (error #418) in
 * production.
 *
 * Pinning both makes the two passes agree by construction. IST is the right
 * pin because the audience is Indian; a user elsewhere sees Indian dates,
 * which is a smaller surprise than a page that fails to hydrate.
 */
const LOCALE = 'en-IN'
const TIME_ZONE = 'Asia/Kolkata'

/** e.g. "19 Sep" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: TIME_ZONE,
  })
}

/** e.g. "19 September 2026" */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  })
}
