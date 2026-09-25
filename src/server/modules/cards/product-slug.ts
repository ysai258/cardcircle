/**
 * Canonical key for a card product name.
 *
 * Products are unique per (bank, card type, slug), so this decides when two
 * names are "the same card". It has to be forgiving about punctuation and
 * casing — one user types "Axis ACE", another "axis ace card" — without
 * collapsing genuinely different products.
 *
 * `+` and `&` are spelled out BEFORE punctuation is stripped. Removing them
 * outright made "IDFC FIRST Power" and "IDFC FIRST Power+" the same key, and
 * likewise "AU Zenith" and "AU Zenith+" — two real, different cards that
 * would have collided on the unique constraint.
 *
 * Not marked `server-only`: the migration generator and the client-side
 * duplicate hint both use it, and all three must agree.
 */
export function productSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
}

/** Tidies user-entered product names before they enter the catalogue. */
export function normalizeProductName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}
