import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { statsApi } from '@/api'

const WEEKDAY_ROWS = [1, 3, 5]

function colorClass(count) {
  if (count === 0) return 'bg-muted/40 border-border'
  if (count <= 2)  return 'bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-900'
  if (count <= 5)  return 'bg-emerald-300 border-emerald-400 dark:bg-emerald-800 dark:border-emerald-700'
  if (count <= 9)  return 'bg-emerald-400 border-emerald-500 dark:bg-emerald-700 dark:border-emerald-600'
  return 'bg-emerald-500 border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500'
}

export default function Heatmap() {
  const { t } = useTranslation()
  const [data, setData] = useState([])
  const [tooltip, setTooltip] = useState(null)

  const MONTHS = t('heatmap.months', { returnObjects: true })
  const WEEKDAYS = t('heatmap.weekdays', { returnObjects: true })

  useEffect(() => {
    statsApi.getHeatmap().then(r => setData(r.data)).catch(() => {})
  }, [])

  if (data.length === 0) return null

  const first = new Date(data[0].date)
  const startDow = first.getDay()
  const padded = Array(startDow).fill(null).concat(data)
  const weeks = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))

  const monthLabels = []
  let lastMonth = -1
  weeks.forEach((week) => {
    const entry = week.find(Boolean)
    if (!entry) { monthLabels.push(''); return }
    const m = new Date(entry.date).getMonth()
    if (m !== lastMonth) { monthLabels.push(MONTHS[m]); lastMonth = m }
    else monthLabels.push('')
  })

  return (
    <div className="overflow-x-auto" onMouseLeave={() => setTooltip(null)}>
      <div className="inline-flex flex-col">
        <div className="mb-1.5 ml-8 flex gap-[3px]">
          {weeks.map((_, wi) => (
            <div key={wi} className="w-[10px] overflow-visible whitespace-nowrap text-[11px] leading-none text-muted-foreground">
              {monthLabels[wi]}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="grid grid-rows-7 gap-[3px] pt-px">
            {Array.from({ length: 7 }, (_, row) => {
              const idx = WEEKDAY_ROWS.indexOf(row)
              return (
                <div key={row} className="flex h-[10px] items-center text-[11px] leading-none text-muted-foreground">
                  {idx >= 0 ? WEEKDAYS[idx] : ''}
                </div>
              )
            })}
          </div>

          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-rows-7 gap-[3px]">
                {Array.from({ length: 7 }, (_, di) => {
                  const entry = week[di]
                  return entry ? (
                    <div
                      key={di}
                      className={`h-[10px] w-[10px] border transition-transform hover:scale-125 cursor-default ${colorClass(entry.count)}`}
                      onMouseEnter={e => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTooltip({ entry, x: rect.left + rect.width / 2, y: rect.top })
                      }}
                    />
                  ) : (
                    <div key={di} className="h-[10px] w-[10px]" />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
          <span>{t('heatmap.less')}</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div key={level} className={`h-[10px] w-[10px] border ${colorClass([0,1,3,7,12][level])}`} />
          ))}
          <span>{t('heatmap.more')}</span>
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow ring-1 ring-border/40"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          <span className="font-medium">{tooltip.entry.date}</span>
          <span className="ml-2 text-muted-foreground">
            {tooltip.entry.count === 0
              ? t('heatmap.noPractice')
              : t('heatmap.practices', { count: tooltip.entry.count })}
            {tooltip.entry.avg_score != null && `，${t('heatmap.avgScore', { score: Math.round(tooltip.entry.avg_score) })}`}
          </span>
        </div>
      )}
    </div>
  )
}
