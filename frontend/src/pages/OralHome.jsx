import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mic2, MessageSquare, BookOpen, ChevronRight } from 'lucide-react'
import { oralApi } from '@/api'

const QUESTION_TYPES = [
  { key: 'read_aloud',  icon: BookOpen,      color: 'text-blue-500',   bg: 'bg-blue-500/10' },
  { key: 'situational', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { key: 'monologue',   icon: Mic2,          color: 'text-rose-500',   bg: 'bg-rose-500/10' },
]

function scoreColor(score) {
  if (score == null) return 'text-muted-foreground'
  if (score >= 80) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-500'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function OralHome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [recent, setRecent] = useState([])

  useEffect(() => {
    oralApi.listAttempts({ limit: 8 }).then(r => setRecent(r.data)).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-4 pt-6 pb-4 flex flex-col gap-6 max-w-2xl mx-auto w-full">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUESTION_TYPES.map(({ key, icon: Icon, color, bg }) => (
            <button
              key={key}
              onClick={() => navigate(`/oral/${key}`)}
              className="flex flex-col gap-3 p-4 rounded-xl border border-border/60 bg-card text-left hover:bg-muted/40 hover:border-border transition-colors group"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground text-sm">{t(`oral.types.${key}.name`)}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {t(`oral.types.${key}.desc`)}
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors self-end" />
            </button>
          ))}
        </div>

        {recent.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('oral.recentAttempts')}
            </h2>
            <div className="rounded-xl border border-border/60 divide-y divide-border/40 overflow-hidden">
              {recent.map(a => {
                const score = a.llm_score ?? a.accuracy_score
                const typeInfo = QUESTION_TYPES.find(q => q.key === a.question_type)
                const Icon = typeInfo?.icon ?? Mic2
                const color = typeInfo?.color ?? 'text-muted-foreground'
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm text-foreground">{a.question_prompt}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <span>{t(`oral.types.${a.question_type}.name`)}</span>
                        {a.question_difficulty && (
                          <><span>·</span><span>{t(`oral.difficulty.${a.question_difficulty}`)}</span></>
                        )}
                        {a.question_language && (
                          <><span>·</span><span className="uppercase">{a.question_language}</span></>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      {score != null && (
                        <span className={`font-bold text-base tabular-nums leading-none ${scoreColor(score)}`}>
                          {Math.round(score)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
