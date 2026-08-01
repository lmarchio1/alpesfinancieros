const COLORES = {
  blue: '#2563eb',
  rose: '#e11d48',
  emerald: '#059669',
  amber: '#d97706',
}

export default function Modelo360Donut() {
  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-full max-h-80 w-full max-w-80">
      <path d="M100,100 L100,10 A90,90 0 0,1 190,100 Z" fill={COLORES.blue} />
      <path d="M100,100 L190,100 A90,90 0 0,1 100,190 Z" fill={COLORES.rose} />
      <path d="M100,100 L100,190 A90,90 0 0,1 10,100 Z" fill={COLORES.emerald} />
      <path d="M100,100 L10,100 A90,90 0 0,1 100,10 Z" fill={COLORES.amber} />

      <g stroke="white" strokeWidth="3">
        <line x1="100" y1="100" x2="100" y2="10" />
        <line x1="100" y1="100" x2="190" y2="100" />
        <line x1="100" y1="100" x2="100" y2="190" />
        <line x1="100" y1="100" x2="10" y2="100" />
      </g>

      <circle cx="100" cy="100" r="46" fill="white" />
      <circle cx="100" cy="100" r="46" fill="none" stroke="#1a41c9" strokeWidth="2" />
      <text x="100" y="97" textAnchor="middle" className="fill-alpesNavy text-[15px] font-extrabold">
        ALPES
      </text>
      <text
        x="100"
        y="113"
        textAnchor="middle"
        className="fill-alpesBronze text-[7px] font-semibold"
        style={{ letterSpacing: '0.1em' }}
      >
        VISIÓN 360°
      </text>
    </svg>
  )
}
