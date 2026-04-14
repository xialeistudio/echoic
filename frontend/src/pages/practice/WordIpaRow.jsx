import { scoreColor } from './utils'

export default function WordIpaRow({ words, activeIndex }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-3">
      {words.map((w, i) => {
        const isActive = i === activeIndex
        const textCls = isActive
          ? 'text-red-500 font-semibold'
          : w.score != null ? scoreColor(w.score) : 'text-foreground font-semibold'
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className={`text-base leading-6 tracking-wide transition-colors duration-100 ${textCls}`}>
              {w.text}
            </span>
            {w.ipa && (
              <span className={`font-[family-name:var(--font-ipa)] text-[11px] leading-4 transition-colors duration-100 ${isActive ? 'text-red-400' : 'text-muted-foreground'}`}>
                {w.ipa}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
