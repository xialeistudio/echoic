import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, TrendingUp, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { audioApi, statsApi } from '@/api'
import Heatmap from '../components/Heatmap'

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="p-2 rounded-md bg-muted">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function ScoreTrend({ recent }) {
  const { t } = useTranslation()
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || recent.length === 0) return

    const scored = recent
      .filter(r => r.accuracy_score != null)
      .reverse() // oldest first
    if (scored.length < 2) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    const scores = scored.map(r => r.accuracy_score)
    const maxScore = 100
    const minScore = 0
    const padX = 36, padY = 20, padBottom = 24

    const chartW = W - padX - 12
    const chartH = H - padY - padBottom

    // Grid lines
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--color-border') || 'rgba(128,128,128,0.15)'
    ctx.lineWidth = 0.5
    for (let v = 0; v <= 100; v += 25) {
      const y = padY + chartH * (1 - (v - minScore) / (maxScore - minScore))
      ctx.beginPath()
      ctx.moveTo(padX, y)
      ctx.lineTo(padX + chartW, y)
      ctx.stroke()

      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--color-muted-foreground') || '#888'
      ctx.font = '10px system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(v.toString(), padX - 6, y + 3)
    }

    // Line
    const step = chartW / Math.max(scores.length - 1, 1)
    ctx.beginPath()
    ctx.strokeStyle = 'oklch(0.65 0.15 160)' // emerald
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    scores.forEach((s, i) => {
      const x = padX + i * step
      const y = padY + chartH * (1 - (s - minScore) / (maxScore - minScore))
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Dots
    ctx.fillStyle = 'oklch(0.65 0.15 160)'
    scores.forEach((s, i) => {
      const x = padX + i * step
      const y = padY + chartH * (1 - (s - minScore) / (maxScore - minScore))
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [recent])

  const scored = recent.filter(r => r.accuracy_score != null)
  if (scored.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        {t('overview.scoreTrendMin')}
      </div>
    )
  }

  return <canvas ref={canvasRef} className="w-full h-48" />
}

function RecentList({ recent }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  if (recent.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('overview.noPractice')}</p>
  }

  return (
    <div className="space-y-2">
      {recent.slice(0, 10).map(r => (
        <div
          key={r.record_id}
          className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => navigate(`/speaking/${r.audio_file_id}`)}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{r.audio_title}</p>
            <p className="text-xs text-muted-foreground truncate">{r.sentence_text}</p>
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            {r.accuracy_score != null ? (
              <span className={`text-sm font-semibold tabular-nums ${
                r.accuracy_score >= 80 ? 'text-green-500' : r.accuracy_score >= 50 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {Math.round(r.accuracy_score)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{t('overview.notScored')}</span>
            )}
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {new Date(r.created_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="p-2 rounded-md bg-muted animate-pulse w-9 h-9" />
        <div className="space-y-2">
          <div className="h-6 w-10 rounded bg-muted animate-pulse" />
          <div className="h-3.5 w-14 rounded bg-muted animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function Overview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 })
  const [recent, setRecent] = useState([])
  const [isEmpty, setIsEmpty] = useState(false)

  useEffect(() => {
    Promise.all([
      statsApi.getHeatmap().then(r => {
        const data = r.data
        const today = new Date().toISOString().slice(0, 10)
        const todayEntry = data.find(d => d.date === today)
        const week = data.slice(-7).reduce((s, d) => s + d.count, 0)
        const total = data.reduce((s, d) => s + d.count, 0)
        setStats({ today: todayEntry?.count ?? 0, week, total })
      }),
      statsApi.getRecent(20).then(r => setRecent(r.data)),
      audioApi.list().then(r => r.data.length),
    ]).then(([, , audioCount]) => {
      setIsEmpty(audioCount === 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (isEmpty && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
        <div className="text-5xl">🎙️</div>
        <h2 className="text-xl font-semibold">{t('overview.emptyTitle', { defaultValue: 'Welcome to Echonic!' })}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t('overview.emptyDesc', { defaultValue: '添加音频素材，开始口语练习之旅' })}
        </p>
        <button
          onClick={() => navigate('/speaking')}
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('overview.emptyAction', { defaultValue: '去添加音频' })}
        </button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('overview.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={Calendar} label={t('overview.today')} value={stats.today} />
            <StatCard icon={TrendingUp} label={t('overview.thisWeek')} value={stats.week} />
            <StatCard icon={Award} label={t('overview.total')} value={stats.total} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-base font-semibold mb-4">{t('overview.scoreTrend')}</h2>
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <div className="h-48 rounded bg-muted/30 animate-pulse" />
              ) : (
                <ScoreTrend recent={recent} />
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <h2 className="text-base font-semibold mb-4">{t('overview.recentPractice')}</h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg border border-border/40 bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <RecentList recent={recent} />
          )}
        </div>
      </div>

      <h2 className="text-base font-semibold mb-4">{t('overview.practiceCalendar')}</h2>
      <Heatmap />
    </div>
  )
}
