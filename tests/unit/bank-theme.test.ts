import { describe, expect, it } from 'vitest'
import {
  bankGradientFor,
  bankInitials,
  bankTheme,
  cardPattern,
} from '@/lib/bank-theme'
import { CARD_PRODUCTS } from '@/db/card-products'

const CODES = CARD_PRODUCTS.map((entry) => entry.bank)

function hexToHue(hex: string): number {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return 0
  let hue: number
  if (max === r) hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6
  else if (max === g) hue = ((b - r) / delta + 2) / 6
  else hue = ((r - g) / delta + 4) / 6
  return hue * 360
}

/** Shortest distance between two hues on the colour wheel. */
function hueGap(a: number, b: number): number {
  const raw = Math.abs(a - b) % 360
  return raw > 180 ? 360 - raw : raw
}

describe('Bank colours are distinguishable', () => {
  it('defines a valid 6-digit hex for every bank', () => {
    for (const code of CODES) {
      const theme = bankTheme(code)
      expect(theme.from, `${code}.from`).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.to, `${code}.to`).toMatch(/^#[0-9a-f]{6}$/i)
      expect(theme.label, `${code}.label`).not.toBe('')
    }
  })

  it('keeps every pair of banks apart on the colour wheel', () => {
    // Most Indian banks brand themselves blue. Copying those brands made
    // HDFC, SBI, Canara, Union, RBL, Yes and Central look identical on
    // screen, which is the whole reason this palette departs from them.
    const hues = CODES.map((code) => ({ code, hue: hexToHue(bankTheme(code).to) }))

    const tooClose: string[] = []
    for (let i = 0; i < hues.length; i += 1) {
      for (let j = i + 1; j < hues.length; j += 1) {
        const gap = hueGap(hues[i]!.hue, hues[j]!.hue)
        if (gap < 12) {
          tooClose.push(`${hues[i]!.code}/${hues[j]!.code} (${gap.toFixed(0)}°)`)
        }
      }
    }

    expect(tooClose).toEqual([])
  })

  it('spreads banks across the whole wheel, not one corner', () => {
    const hues = CODES.map((code) => hexToHue(bankTheme(code).to))
    // Six 60-degree sectors; a usable palette occupies most of them.
    const sectors = new Set(hues.map((hue) => Math.floor(hue / 60)))
    expect(sectors.size).toBeGreaterThanOrEqual(4)
  })
})

describe('Per-card variation', () => {
  it('is deterministic', () => {
    expect(bankGradientFor('HDFC', 'A')).toBe(bankGradientFor('HDFC', 'A'))
    expect(cardPattern('A')).toBe(cardPattern('A'))
  })

  it('gives different products of one bank different faces', () => {
    const faces = new Set(
      ['HDFC Millennia', 'HDFC Regalia', 'HDFC Freedom', 'HDFC Infinia'].map(
        (name) => bankGradientFor('HDFC', `HDFC:${name}`),
      ),
    )
    expect(faces.size).toBe(4)
  })

  it('produces a label for every bank, short enough for the small mark', () => {
    for (const code of CODES) {
      const label = bankInitials(code, code)
      expect(label.length, `${code} label "${label}"`).toBeLessThanOrEqual(8)
    }
  })
})
