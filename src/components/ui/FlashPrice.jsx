import { usePriceFlash } from '../../hooks/usePriceFlash'

export default function FlashPrice({ value, formatted, className = '' }) {
  const flash = usePriceFlash(value)
  const colorClass = flash === 'up' ? 'text-emerald-600' : flash === 'down' ? 'text-rose-600' : 'text-slate-900'

  return <p className={`transition-colors duration-1000 ${colorClass} ${className}`}>{formatted}</p>
}
