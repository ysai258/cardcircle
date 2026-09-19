/**
 * The deny-list used to catch leaks that the allow-listed DTO builders were
 * supposed to prevent.
 *
 * This is defence in depth, NOT the primary control. The primary control is
 * that every DTO is built by explicit field assignment. This exists to turn
 * a mistake in that layer into a loud 500 rather than a silent disclosure.
 *
 * Deliberately NOT marked `server-only` so tests can import it directly.
 */

/** Key names that must never appear in an API response or a log line. */
export const FORBIDDEN_KEYS: readonly string[] = [
  // Raw card credentials. These have no column in the schema and never will;
  // listed so that any future code inventing them fails loudly.
  'pan',
  'fullpan',
  'cardnumber',
  'rawcardnumber',
  'cvv',
  'cvc',
  'securitycode',
  'otp',
  'pin',
  'atmpin',
  'netbankingpassword',
  // Real columns that must never cross the wire.
  'passwordhash',
  'password',
  'phonehmac',
  'phonect',
  'expiryct',
  'tokensha256',
  'sessiontoken',
  'appmasterkey',
]

const FORBIDDEN = new Set(FORBIDDEN_KEYS)

/** Lowercases and strips separators so `phone_ct`, `phoneCt` and `PhoneCT` all collapse. */
export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_\-\s]/g, '')
}

export function isForbiddenKey(key: string): boolean {
  return FORBIDDEN.has(normalizeKey(key))
}

/**
 * Walks a value and returns the paths of any forbidden keys found.
 *
 * Handles cycles, so a self-referential object cannot hang the request.
 */
export function findForbiddenKeys(value: unknown): string[] {
  const found: string[] = []
  const seen = new WeakSet<object>()

  function walk(node: unknown, path: string): void {
    if (node === null || typeof node !== 'object') return
    if (seen.has(node)) return
    seen.add(node)

    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}[${i}]`))
      return
    }

    for (const [key, child] of Object.entries(node)) {
      const childPath = path ? `${path}.${key}` : key
      if (isForbiddenKey(key)) found.push(childPath)
      walk(child, childPath)
    }
  }

  walk(value, '')
  return found
}

/**
 * Returns a copy with forbidden values replaced by "[REDACTED]".
 *
 * Used for log payloads, where dropping the key entirely would hide the fact
 * that something tried to log a secret.
 */
export function redact(value: unknown): unknown {
  const seen = new WeakSet<object>()

  function walk(node: unknown): unknown {
    if (node === null || typeof node !== 'object') return node
    if (seen.has(node)) return '[CIRCULAR]'
    seen.add(node)

    if (Array.isArray(node)) return node.map(walk)
    if (Buffer.isBuffer(node)) return '[BUFFER]'

    return Object.fromEntries(
      Object.entries(node).map(([key, child]) => [
        key,
        isForbiddenKey(key) ? '[REDACTED]' : walk(child),
      ]),
    )
  }

  return walk(value)
}
