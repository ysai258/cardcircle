import { bankGradient, bankInitials } from '@/lib/bank-theme'

/**
 * A bank's visual mark.
 *
 * Renders the bank's real logo when one is on file, and a branded monogram
 * otherwise. The monogram is the default rather than a placeholder: usable
 * bank logos turned out not to be obtainable programmatically — every free
 * source returns 16x16 favicons, generic fallbacks, or 404 pages — and a
 * blurry 16px smudge on a card face looks worse than a crisp monogram.
 *
 * `logoUrl` is served from this origin (see scripts/set-bank-logos.ts), so
 * the Content-Security-Policy stays `img-src 'self'` and no third party
 * learns which banks a user is browsing.
 */
export function BankMark({
  code,
  name,
  logoUrl,
  size = 'md',
  className = '',
}: {
  code: string
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const box =
    size === 'sm'
      ? 'size-5 rounded-md'
      : size === 'lg'
        ? 'size-12 rounded-xl'
        : 'size-9 rounded-lg'
  const text =
    size === 'sm' ? 'text-[7px]' : size === 'lg' ? 'text-xs' : 'text-[10px]'

  /**
   * The small mark clips its label to three characters.
   *
   * Full labels are written for the larger tiles — "IndusInd", "Bandhan" —
   * and at 20px they overflowed the box and collided with the bank name
   * printed beside them. Clipping is safe here precisely because the full
   * name is always adjacent at this size; the mark is carrying colour, not
   * identification.
   */
  const label = bankInitials(code, name)
  const shown = size === 'sm' ? label.slice(0, 3).toUpperCase() : label

  if (logoUrl) {
    return (
      <span
        className={`${box} grid shrink-0 place-items-center overflow-hidden bg-white ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="size-full object-contain p-0.5"
          loading="lazy"
        />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${box} ${text} grid shrink-0 place-items-center overflow-hidden font-bold leading-none tracking-tight text-white ${className}`}
      style={{ background: bankGradient(code) }}
    >
      {shown}
    </span>
  )
}
