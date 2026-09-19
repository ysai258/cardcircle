import { describe, expect, it } from 'vitest'
import { normalizeDatabaseUrl } from '@/db/connection-url'

/**
 * Regression tests for a failure that only shows up against a real provider:
 * Neon's copy-paste connection string contains `channel_binding=require`,
 * which postgres.js forwards to the server, which rejects it.
 */
describe('normalizeDatabaseUrl', () => {
  it('strips channel_binding from a Neon pooled connection string', () => {
    const neon =
      'postgresql://user:pw@ep-snowy-darkness-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

    const result = normalizeDatabaseUrl(neon)

    expect(result).not.toContain('channel_binding')
    // sslmode must survive — postgres.js needs it to negotiate TLS.
    expect(result).toContain('sslmode=require')
    expect(result).toContain('-pooler')
    expect(result).toContain('user:pw@')
  })

  it('keeps sslmode, which postgres.js understands', () => {
    const url = 'postgresql://u:p@h/db?sslmode=require'
    expect(normalizeDatabaseUrl(url)).toBe(url)
  })

  it('removes a trailing ? when every parameter was stripped', () => {
    expect(normalizeDatabaseUrl('postgresql://u:p@h/db?channel_binding=require')).toBe(
      'postgresql://u:p@h/db',
    )
  })

  it('leaves a plain connection string untouched', () => {
    const url = 'postgresql://cardcircle:pw@localhost:55433/cardcircle'
    expect(normalizeDatabaseUrl(url)).toBe(url)
  })

  it('strips pgbouncer from a Supabase pooled connection string', () => {
    const supabase =
      'postgresql://postgres.abc:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

    const result = normalizeDatabaseUrl(supabase)

    // Postgres rejects the connection outright if this reaches it.
    expect(result).not.toContain('pgbouncer')
    expect(result).toContain('pooler.supabase.com:6543')
    expect(result).toContain('postgres.abc:pw@')
  })

  it('returns unparseable input unchanged rather than throwing', () => {
    expect(normalizeDatabaseUrl('not a url')).toBe('not a url')
  })

  it('strips the other client-only libpq parameters too', () => {
    const result = normalizeDatabaseUrl(
      'postgresql://u:p@h/db?sslmode=require&sslrootcert=/x&gssencmode=disable&target_session_attrs=read-write',
    )
    expect(result).toBe('postgresql://u:p@h/db?sslmode=require')
  })
})
