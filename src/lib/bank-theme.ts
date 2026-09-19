/**
 * Per-bank colour, used to make a card look like a card.
 *
 * These are approximations of each issuer's brand palette, used only as a
 * background wash so cards are recognisable at a glance. Deliberately NOT
 * their logos or wordmarks: shipping those would imply an affiliation
 * CardCircle does not have. A colour is decoration; a logo is a claim.
 *
 * Colours live here rather than in the database because they are
 * presentation, and putting them in `banks` would mean a migration every
 * time a brand refreshes.
 */

export type BankTheme = {
  /** Gradient start and end for the card face. */
  from: string
  to: string
  /** Text colour that meets contrast on that gradient. */
  ink: string
  /** Muted text on the same background. */
  inkMuted: string
  /**
   * Short label for the corner mark.
   *
   * Stated explicitly rather than derived: deriving it truncated codes to
   * four characters, which turned ICICI into "ICIC" and Kotak Mahindra into
   * "KM". A bank's short name is the name people use, not an abbreviation
   * rule — so it is data, not logic.
   */
  label: string
}

const LIGHT_INK = { ink: '#ffffff', inkMuted: 'rgba(255,255,255,0.72)' }
const DARK_INK = { ink: '#10131a', inkMuted: 'rgba(16,19,26,0.66)' }

const THEMES: Record<string, BankTheme> = {
  HDFC: { from: '#003d7a', to: '#0a5fb4', ...LIGHT_INK, label: 'HDFC' },
  SBI: { from: '#1a3480', to: '#2f5bc4', ...LIGHT_INK, label: 'SBI' },
  ICICI: { from: '#8c1f4e', to: '#d4622a', ...LIGHT_INK, label: 'ICICI' },
  AXIS: { from: '#7a0f3d', to: '#c2185b', ...LIGHT_INK, label: 'AXIS' },
  KOTAK: { from: '#9e1015', to: '#e03a32', ...LIGHT_INK, label: 'KOTAK' },
  IDFC: { from: '#7d1620', to: '#c8342c', ...LIGHT_INK, label: 'IDFC' },
  RBL: { from: '#00335c', to: '#0a5a96', ...LIGHT_INK, label: 'RBL' },
  INDUSIND: { from: '#7d1527', to: '#b8455c', ...LIGHT_INK, label: 'IndusInd' },
  AMEX: { from: '#00589c', to: '#3f9ae0', ...LIGHT_INK, label: 'AMEX' },
  BOB: { from: '#b8420f', to: '#f2761f', ...LIGHT_INK, label: 'BoB' },
  PNB: { from: '#7d1322', to: '#b8323f', ...LIGHT_INK, label: 'PNB' },
  CANARA: { from: '#00407d', to: '#1f6fb8', ...LIGHT_INK, label: 'Canara' },
  UNION: { from: '#16306e', to: '#2f5cad', ...LIGHT_INK, label: 'Union' },
  YES: { from: '#00406e', to: '#0d6ba8', ...LIGHT_INK, label: 'YES' },
  IDBI: { from: '#00503a', to: '#0f8a5f', ...LIGHT_INK, label: 'IDBI' },
  FEDERAL: { from: '#c26a0a', to: '#f5a623', ...DARK_INK, label: 'Federal' },
  BOI: { from: '#c2470f', to: '#f57a29', ...LIGHT_INK, label: 'BoI' },
  INDIANBANK: { from: '#123566', to: '#2b5f9e', ...LIGHT_INK, label: 'Indian' },
  CENTRAL: { from: '#002678', to: '#1a4fb8', ...LIGHT_INK, label: 'Central' },
  AUSFB: { from: '#9e1015', to: '#e0342c', ...LIGHT_INK, label: 'AU' },
  BANDHAN: { from: '#8a151c', to: '#c23a3a', ...LIGHT_INK, label: 'Bandhan' },
  SCB: { from: '#00539b', to: '#0a86d6', ...LIGHT_INK, label: 'SC' },
  HSBC: { from: '#9e000c', to: '#db0011', ...LIGHT_INK, label: 'HSBC' },
  CITI: { from: '#014f86', to: '#0a86c4', ...LIGHT_INK, label: 'Citi' },
  DBS: { from: '#a81d1d', to: '#e04040', ...LIGHT_INK, label: 'DBS' },
  // Blue into orange, echoing CSB's wordmark-and-swoosh pairing and keeping
  // it distinguishable from the other blue issuers.
  CSB: { from: '#014a8f', to: '#e8762a', ...LIGHT_INK, label: 'CSB' },
}

/** Neutral slate for any bank without a defined palette. */
const FALLBACK: BankTheme = {
  from: '#2d3748',
  to: '#4a5568',
  ...LIGHT_INK,
  label: '',
}

export function bankTheme(code: string): BankTheme {
  return THEMES[code.toUpperCase()] ?? FALLBACK
}

/** `linear-gradient(...)` for a card face. */
export function bankGradient(code: string): string {
  const theme = bankTheme(code)
  return `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`
}

/**
 * Short label shown on the card face and bank tiles.
 *
 * Falls back to the bank's code for anything not in the table, truncated
 * only as a last resort.
 */
export function bankInitials(code: string, name: string): string {
  const known = THEMES[code.toUpperCase()]
  if (known?.label) return known.label
  if (code.length <= 8) return code.toUpperCase()
  return name.split(/\s+/)[0]?.slice(0, 8).toUpperCase() ?? code.slice(0, 8)
}
