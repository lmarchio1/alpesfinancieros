const GRADIENTES = {
  blue: ['#93c5fd', '#1e40af'],
  rose: ['#fda4af', '#9f1239'],
  emerald: ['#6ee7b7', '#065f46'],
  amber: ['#fde68a', '#92400e'],
}

export default function Modelo360Donut() {
  return (
    <div className="relative mx-auto h-full max-h-80 w-full max-w-80">
      <div
        aria-hidden="true"
        className="absolute -inset-4 rounded-full bg-gradient-to-br from-blue-400 via-rose-400 to-amber-400 opacity-60 blur-3xl"
      />
      <svg viewBox="0 0 200 200" className="relative h-full w-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.55)]">
        <defs>
          {Object.entries(GRADIENTES).map(([name, [from, to]]) => (
            <linearGradient key={name} id={`grad-${name}`} x1="0.1" y1="0.1" x2="0.9" y2="0.9">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
          ))}
          <radialGradient id="grad-center" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#eef2f7" />
          </radialGradient>
          <radialGradient id="grad-sheen" cx="32%" cy="24%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="93" fill="none" stroke="black" strokeOpacity="0.15" strokeWidth="4" />

        <path d="M100,100 L100,10 A90,90 0 0,1 190,100 Z" fill="url(#grad-blue)" />
        <path d="M100,100 L190,100 A90,90 0 0,1 100,190 Z" fill="url(#grad-rose)" />
        <path d="M100,100 L100,190 A90,90 0 0,1 10,100 Z" fill="url(#grad-emerald)" />
        <path d="M100,100 L10,100 A90,90 0 0,1 100,10 Z" fill="url(#grad-amber)" />
        <circle cx="100" cy="100" r="90" fill="url(#grad-sheen)" />

        <g stroke="white" strokeWidth="3.5" strokeLinecap="round">
          <line x1="100" y1="100" x2="100" y2="10" />
          <line x1="100" y1="100" x2="190" y2="100" />
          <line x1="100" y1="100" x2="100" y2="190" />
          <line x1="100" y1="100" x2="10" y2="100" />
        </g>
        <circle cx="100" cy="100" r="90" fill="none" stroke="white" strokeOpacity="0.8" strokeWidth="2.5" />

        <circle cx="100" cy="100" r="49" fill="black" fillOpacity="0.25" />
        <circle cx="100" cy="100" r="46" fill="url(#grad-center)" />
        <circle cx="100" cy="100" r="46" fill="none" stroke="#1a41c9" strokeWidth="2.5" />
        <text x="100" y="97" textAnchor="middle" className="fill-alpesNavy text-[16px] font-extrabold">
          ALPES
        </text>
        <text
          x="100"
          y="113"
          textAnchor="middle"
          className="fill-alpesBronze text-[7px] font-bold"
          style={{ letterSpacing: '0.12em' }}
        >
          VISIÓN 360°
        </text>
      </svg>
    </div>
  )
}
