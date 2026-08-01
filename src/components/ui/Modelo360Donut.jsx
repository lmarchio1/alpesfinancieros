const SEGMENTOS = [
  { from: '#f3d78a', to: '#c9971c' }, // oro claro
  { from: '#e0a94a', to: '#a8681a' }, // oro
  { from: '#c98a4f', to: '#8a4f1e' }, // cobre
  { from: '#a97a3a', to: '#5f3a16' }, // bronce
]

const R = 72
const STROKE = 28
const CIRCUM = 2 * Math.PI * R
const QUARTER = CIRCUM / 4
const GAP = 9
const SEG_LEN = QUARTER - GAP

export default function Modelo360Donut() {
  return (
    <div className="relative mx-auto h-full max-h-80 w-full max-w-80">
      <div
        aria-hidden="true"
        className="absolute -inset-4 rounded-full bg-gradient-to-br from-amber-300 via-yellow-200 to-orange-300 opacity-50 blur-3xl"
      />
      <svg viewBox="0 0 200 200" className="relative h-full w-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)]">
        <defs>
          {SEGMENTOS.map((seg, i) => (
            <linearGradient key={i} id={`ring-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={seg.from} />
              <stop offset="100%" stopColor={seg.to} />
            </linearGradient>
          ))}
          <radialGradient id="ring-center" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f4ede0" />
          </radialGradient>
        </defs>

        <g transform="rotate(-90 100 100)">
          {SEGMENTOS.map((_, i) => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={`url(#ring-grad-${i})`}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${SEG_LEN} ${CIRCUM - SEG_LEN}`}
              strokeDashoffset={-(i * QUARTER)}
            />
          ))}
        </g>

        <circle cx="100" cy="100" r="51" fill="black" fillOpacity="0.18" />
        <circle cx="100" cy="100" r="48" fill="url(#ring-center)" />
        <circle cx="100" cy="100" r="48" fill="none" stroke="#c9971c" strokeWidth="1.5" />
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
