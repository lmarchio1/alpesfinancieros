export default function SectionHeading({ eyebrow, title, description, align = 'left', variant = 'light' }) {
  const alignment = align === 'center' ? 'text-center mx-auto' : 'text-left'
  const isDark = variant === 'dark'

  return (
    <div className={`max-w-2xl ${alignment} mb-10`}>
      {eyebrow && (
        <span
          className={`text-sm font-semibold uppercase tracking-wider ${
            isDark ? 'text-brand-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]' : 'text-brand-600'
          }`}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${
          isDark ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]' : 'text-slate-900'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-3 text-base ${
            isDark ? 'text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]' : 'text-slate-600'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  )
}
