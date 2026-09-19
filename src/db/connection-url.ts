/**
 * Connection string normalisation.
 *
 * `postgres.js` forwards any query parameter it does not recognise to the
 * server as a startup parameter. Some libpq parameters are client-side only
 * and are not Postgres settings, so the server rejects the connection:
 *
 *     FATAL: unrecognized configuration parameter "channel_binding"
 *
 * Neon's console puts `channel_binding=require` in the connection string it
 * tells you to copy, so pasting that string verbatim — the obvious thing to
 * do — breaks every database call. Stripping the client-only parameters here
 * means any connection string a provider hands you works as pasted.
 *
 * Not marked `server-only`: the migration script imports this too, and runs
 * outside the Next.js runtime.
 */

/**
 * libpq parameters that are client-side only.
 *
 * `sslmode` is deliberately NOT in this list — postgres.js understands it and
 * uses it to decide on TLS, so removing it would silently downgrade the
 * connection to plaintext.
 */
const CLIENT_ONLY_PARAMS = [
  'channel_binding',
  'sslcert',
  'sslkey',
  'sslrootcert',
  'sslcrl',
  'gssencmode',
  'krbsrvname',
  'target_session_attrs',
]

/**
 * Removes parameters that postgres.js would forward to the server.
 *
 * Returns the input unchanged if it cannot be parsed, so a malformed URL
 * fails later with a connection error rather than here with a parse error.
 */
export function normalizeDatabaseUrl(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return rawUrl
  }

  let changed = false
  for (const param of CLIENT_ONLY_PARAMS) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param)
      changed = true
    }
  }

  if (!changed) return rawUrl

  // Drop a trailing "?" left behind when every parameter was removed.
  return url.toString().replace(/\?$/, '')
}
