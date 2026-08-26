import alpesIcon from '../../assets/alpes-icon.png'
import alpesIconDark from '../../assets/alpes-icon-dark.png'

export default function Logo({
  variant = 'dark',
  iconClassName = 'h-10 w-auto',
  nameClassName = 'text-xl',
  taglineClassName = 'text-[10px]',
  gap = 'gap-2.5',
}) {
  const alpesColor = variant === 'light' ? 'text-white' : 'text-alpesNavy'
  // El ícono metálico "dark mode" está pensado para fondos oscuros (footer);
  // sobre fondo claro (header) se ven feos sus bordes, así que ahí se sigue
  // usando el ícono plano de siempre.
  const icon = variant === 'light' ? alpesIconDark : alpesIcon
  const taglineColor = variant === 'light' ? 'text-[#d48b5e]' : 'text-alpesBronze'

  return (
    <div className={`flex items-center ${gap}`}>
      <img src={icon} alt="" className={iconClassName} />
      <div className="leading-none">
        <p className={`font-extrabold tracking-wide ${nameClassName} ${alpesColor}`}>ALPES</p>
        <p className={`mt-1 font-semibold tracking-[0.16em] ${taglineColor} ${taglineClassName}`}>
          ESTADOS FINANCIEROS
        </p>
      </div>
    </div>
  )
}
