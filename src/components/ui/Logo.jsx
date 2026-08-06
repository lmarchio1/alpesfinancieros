import alpesIcon from '../../assets/alpes-icon.png'

export default function Logo({
  variant = 'dark',
  iconClassName = 'h-10 w-auto',
  nameClassName = 'text-xl',
  taglineClassName = 'text-[10px]',
  gap = 'gap-2.5',
}) {
  const alpesColor = variant === 'light' ? 'text-white' : 'text-alpesNavy'

  return (
    <div className={`flex items-center ${gap}`}>
      <img src={alpesIcon} alt="" className={iconClassName} />
      <div className="leading-none">
        <p className={`font-extrabold tracking-wide ${nameClassName} ${alpesColor}`}>ALPES</p>
        <p className={`mt-1 font-semibold tracking-[0.16em] text-alpesBronze ${taglineClassName}`}>
          ESTADOS FINANCIEROS
        </p>
      </div>
    </div>
  )
}
