export default function DayChangeBadge({ current, previous, className = '' }) {
  if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return null

  const diff = current - previous
  const pct = (diff / previous) * 100

  if (Math.abs(diff) < 0.005) {
    return <span className={`text-xs font-medium text-slate-400 ${className}`}>sin cambios</span>
  }

  const isUp = diff > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-700' : 'text-rose-700'} ${className}`}
    >
      {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
    </span>
  )
}
