export default function Card({ className = '', children }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 ${className}`}
    >
      {children}
    </div>
  )
}
