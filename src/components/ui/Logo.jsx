import alpesIcon from '../../assets/alpes-icon.png'

export default function Logo({ variant = 'dark', iconClassName = 'h-10 w-auto' }) {
  const alpesColor = variant === 'light' ? 'text-white' : 'text-alpesNavy'

  return (
    <div className="flex items-center gap-2.5">
      <img src={alpesIcon} alt="" className={iconClassName} />
      <div className="leading-none">
        <p className={`text-xl font-extrabold tracking-wide ${alpesColor}`}>ALPES</p>
        <p className="text-[10px] font-semibold tracking-[0.16em] text-alpesBronze">
          ESTADOS FINANCIEROS
        </p>
      </div>
    </div>
  )
}
