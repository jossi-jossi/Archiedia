import { CaretDown } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'

interface Props {
  label: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}

export function FilterDropdown({ label, options, selected, onChange }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function toggle(opt: string): void {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt])
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="tag tag-outline"
        onClick={() => setOpen((o) => !o)}
        style={{
          cursor: 'pointer',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          whiteSpace: 'nowrap'
        }}
      >
        {label}
        {selected.length > 0 ? ` (${selected.length})` : ''}
        <CaretDown size={11} />
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 10,
            minWidth: 180,
            maxHeight: 260,
            overflowY: 'auto',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: 6
          }}
        >
          {options.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-neutral-500)', padding: '6px 8px' }}>
              옵션 없음
            </div>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 8px',
                fontSize: 13,
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
