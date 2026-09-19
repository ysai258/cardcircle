'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * A searchable select.
 *
 * A plain <select> with 25 banks means scrolling to find yours; typing three
 * letters is faster. Native <select> cannot do that, so this implements the
 * ARIA combobox pattern properly rather than approximating it with a styled
 * div:
 *
 *   - role="combobox" with aria-expanded / aria-controls / aria-activedescendant
 *   - Up/Down move the active option WITHOUT moving focus out of the input
 *   - Enter selects, Escape closes and restores the last selection
 *   - the active option is announced and scrolled into view
 *   - the real value rides in a hidden input, so normal form submission works
 *
 * Matching is on a normalised string, so "sbi" finds "State Bank of India"
 * and "kotak" finds "Kotak Mahindra Bank" regardless of casing or spacing.
 */

export type ComboboxOption = {
  value: string
  label: string
  /** Extra text to match on, e.g. a bank code or common abbreviation. */
  keywords?: string
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function Combobox({
  label,
  name,
  options,
  placeholder = 'Search…',
  hint,
  error,
  defaultValue,
  onChange,
  renderOption,
}: {
  label: string
  name: string
  options: ComboboxOption[]
  placeholder?: string
  hint?: string
  error?: string
  defaultValue?: string
  onChange?: (value: string) => void
  renderOption?: (option: ComboboxOption) => React.ReactNode
}) {
  const id = useId()
  const listId = `${id}-list`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  const [selected, setSelected] = useState<string>(defaultValue ?? '')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedOption = options.find((option) => option.value === selected)

  const filtered = useMemo(() => {
    const needle = normalize(query)
    if (needle.length === 0) return options

    return options.filter((option) => {
      const haystack = normalize(`${option.label} ${option.keywords ?? ''}`)
      return haystack.includes(needle)
    })
  }, [options, query])

  // Close when focus or a click leaves the component entirely.
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Keep the active option visible while arrowing through a long list.
  useEffect(() => {
    if (!open) return
    const node = listRef.current?.children[activeIndex] as
      | HTMLElement
      | undefined
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  function choose(option: ComboboxOption) {
    setSelected(option.value)
    setQuery('')
    setOpen(false)
    onChange?.(option.value)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        setActiveIndex(0)
        return
      }
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => {
        if (filtered.length === 0) return 0
        return (current + delta + filtered.length) % filtered.length
      })
      return
    }

    if (event.key === 'Enter' && open) {
      event.preventDefault()
      const option = filtered[activeIndex]
      if (option) choose(option)
      return
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      setQuery('')
      return
    }

    if (event.key === 'Tab') setOpen(false)
  }

  // What the input displays: the search text while open, otherwise the
  // chosen label — so the field always shows the current selection at rest.
  const displayValue = open ? query : (selectedOption?.label ?? '')

  return (
    <div className="space-y-1.5" ref={rootRef}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered[activeIndex] ? `${id}-opt-${activeIndex}` : undefined
          }
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          aria-invalid={error ? true : undefined}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          value={displayValue}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 pr-9 text-sm text-ink',
            'placeholder:text-ink-faint transition-colors focus:border-accent',
            error && 'border-danger',
          )}
        />

        {/* The value the form actually submits. */}
        <input type="hidden" name={name} value={selected} />

        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-faint"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M6 8l4 4 4-4" />
          </svg>
        </span>

        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border-strong bg-surface-raised py-1 shadow-raised"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-ink-muted">
                No match for “{query}”
              </li>
            )}

            {filtered.map((option, index) => (
              <li
                key={option.value}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={option.value === selected}
                // onMouseDown, not onClick: mousedown fires before the input
                // loses focus, so the list is still open when we read it.
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(option)
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  index === activeIndex
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink',
                )}
              >
                {renderOption ? renderOption(option) : option.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
