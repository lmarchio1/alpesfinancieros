import { useEffect, useRef, useState } from 'react'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function parse(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  return { y, m }
}

export default function MonthPicker({ value, onChange, min, max }) {
  const [open, setOpen] = useState(false)
  const { y: selY, m: selM } = parse(value)
  const [browseYear, setBrowseYear] = useState(selY)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) setBrowseYear(selY)
  }, [open, selY])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const minParts = min ? parse(min) : null
  const maxParts = max ? parse(max) : null

  function isDisabled(y, m) {
    const ym = `${y}-${String(m).padStart(2, '0')}`
    if (min && ym < min) return true
    if (max && ym > max) return true
    return false
  }

  const formatted = new Date(selY, selM - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-1 flex w-full items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-left text-sm capitalize text-slate-900 transition-colors hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {formatted}
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setBrowseYear((y) => y - 1)}
              disabled={minParts ? browseYear <= minParts.y : false}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-900">{browseYear}</span>
            <button
              type="button"
              onClick={() => setBrowseYear((y) => y + 1)}
              disabled={maxParts ? browseYear >= maxParts.y : false}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {MESES.map((label, i) => {
              const m = i + 1
              const disabled = isDisabled(browseYear, m)
              const isSelected = browseYear === selY && m === selM
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(`${browseYear}-${String(m).padStart(2, '0')}`)
                    setOpen(false)
                  }}
                  className={`rounded-md py-1.5 text-sm transition-colors ${
                    isSelected
                      ? 'bg-brand-600 font-semibold text-white'
                      : disabled
                        ? 'cursor-not-allowed text-slate-300'
                        : 'text-slate-700 hover:bg-brand-50'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
