import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { schema } from '@/db/schema'

/**
 * The database safety net.
 *
 * Fails the build if a prohibited card field is ever introduced into the
 * runtime schema or a migration. This is the check that makes "we never
 * store PANs" an enforced property rather than a promise in a README.
 *
 * It inspects the PARSED Drizzle schema and the generated DDL — not the
 * source text — so that documentation, comments and the security tests
 * themselves may freely mention `cvv` without tripping it. That distinction
 * matters: a checker that grepped for the string would either be disabled by
 * its own false positives or force the docs to avoid naming the risk.
 */

const PROHIBITED_COLUMN_NAMES = [
  'pan',
  'full_pan',
  'fullpan',
  'card_number',
  'cardnumber',
  'raw_card_number',
  'rawcardnumber',
  'card_no',
  'cvv',
  'cvc',
  'security_code',
  'securitycode',
  'cvv2',
  'otp',
  'pin',
  'atm_pin',
  'card_pin',
  'net_banking_password',
  'netbanking_password',
  'card_password',
]

function normalize(name: string): string {
  return name.toLowerCase().replace(/[_\-\s]/g, '')
}

const PROHIBITED_NORMALIZED = new Set(PROHIBITED_COLUMN_NAMES.map(normalize))

describe('Runtime schema contains no prohibited card fields', () => {
  const tables = Object.entries(schema) as Array<[string, PgTable]>

  it('exposes every table to this check', () => {
    // Guards against a new table being added to the database but left out of
    // the exported `schema` object, which would silently skip it here.
    expect(tables.length).toBeGreaterThan(0)
  })

  for (const [exportName, table] of tables) {
    it(`table "${exportName}" has no prohibited column`, () => {
      const config = getTableConfig(table)
      const offending = config.columns
        .map((column) => column.name)
        .filter((name) => PROHIBITED_NORMALIZED.has(normalize(name)))

      expect(offending).toEqual([])
    })
  }

  it('stores no column whose name suggests a full card number', () => {
    const allColumns = tables.flatMap(([tableName, table]) =>
      getTableConfig(table).columns.map(
        (column) => `${tableName}.${column.name}`,
      ),
    )

    // Anything card-number-ish beyond the exact list above.
    const suspicious = allColumns.filter((qualified) => {
      const column = normalize(qualified.split('.')[1] ?? '')
      return (
        column.includes('cardnumber') ||
        column.includes('fullpan') ||
        column.includes('cvv')
      )
    })

    expect(suspicious).toEqual([])
  })
})

describe('Generated migrations contain no prohibited card fields', () => {
  const migrationsDir = join(process.cwd(), 'src/db/migrations')
  const files = readdirSync(migrationsDir).filter((file) =>
    file.endsWith('.sql'),
  )

  it('finds migration files to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    it(`migration "${file}" declares no prohibited column`, () => {
      const sql = readFileSync(join(migrationsDir, file), 'utf8')

      // Drizzle emits every column as a quoted identifier followed by its
      // type. Matching that shape, rather than the bare word, keeps the
      // check precise.
      const declared = [...sql.matchAll(/"([a-z0-9_]+)"\s+"?[a-z]/gi)].map(
        (match) => match[1] ?? '',
      )

      const offending = declared.filter((name) =>
        PROHIBITED_NORMALIZED.has(normalize(name)),
      )

      expect(offending).toEqual([])
    })
  }
})

describe('The check itself works', () => {
  // A checker that cannot fail is not a checker. These assert the matcher
  // actually rejects the names it claims to, and spares the ones it should.
  it('recognises prohibited names in every spelling', () => {
    for (const name of ['pan', 'CVV', 'card_number', 'cardNumber', 'full_pan']) {
      expect(PROHIBITED_NORMALIZED.has(normalize(name))).toBe(true)
    }
  })

  it('does not reject legitimate column names', () => {
    for (const name of [
      'bin',
      'last4',
      'expiry_ct',
      'phone_ct',
      'nickname',
      'discoverability',
      'panel_id',
      'pincode',
    ]) {
      expect(PROHIBITED_NORMALIZED.has(normalize(name))).toBe(false)
    }
  })
})
