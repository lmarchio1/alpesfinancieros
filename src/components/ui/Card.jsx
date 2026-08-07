export default function Card({ className = '', children, ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
