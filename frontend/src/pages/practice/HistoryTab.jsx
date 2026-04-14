import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import ScoreCard from '@/components/ScoreCard'
import { scoreColor, chipBg } from './utils'

export default function HistoryTab({ history, currentRecordId, result, wordSummary, selectedSentence, onLoadRecord, onDeleteRecord }) {
  const { t } = useTranslation()
  return (
    <>
      {/* History list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {selectedSentence ? t('practice.noPractice') : t('practice.selectToView')}
          </p>
        ) : (
          <div className="space-y-2">
            {history.map(r => {
              const selected = r.id === currentRecordId
              return (
                <div
                  key={r.id}
                  className={`cursor-pointer rounded-lg border border-border/40 p-3 transition-colors ${
                    selected ? 'bg-accent' : 'hover:bg-muted/30'
                  }`}
                  onClick={() => onLoadRecord(r)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString('zh-CN')}
                    </p>
                    <button
                      className="text-muted-foreground/50 hover:text-destructive transition-colors"
                      onClick={e => onDeleteRecord(e, r)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-5">
                    {[[t('practice.accuracy'), r.accuracy_score], [t('practice.fluency'), r.fluency_score], [t('practice.completeness'), r.completeness_score]].map(([label, val]) => (
                      <div key={label} className="flex flex-col items-center gap-0.5">
                        <span className={`text-base font-semibold tabular-nums ${scoreColor(val)}`}>
                          {val != null ? Math.round(val) : '—'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Word summary */}
      {wordSummary.length > 0 && (
        <div className="shrink-0 border-t border-border/30 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {t('practice.wordSummary')}
          </p>
          <div className="flex flex-wrap gap-2">
            {wordSummary.map(({ word, avg, count }) => (
              <div key={word} className="flex flex-col items-center gap-0.5">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${chipBg(avg)}`}>{word}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {Math.round(avg)}{count > 1 ? ` ×${count}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail panel */}
      {result?.accuracy_score != null && (
        <div className="shrink-0 max-h-[55%] overflow-y-auto border-t border-border/30 px-5 py-4">
          <ScoreCard result={result} />
        </div>
      )}
    </>
  )
}
