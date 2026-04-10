import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import Heatmap from '../components/Heatmap'
import { statsApi } from '@/api'

function scoreColor(score) {
  if (score >= 80) return 'text-green-500'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

export default function Home() {
  const [recent, setRecent] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    statsApi.getRecent(15).then(r => setRecent(r.data)).catch(() => {})
  }, [])

  return (
    <div className="space-y-6 p-6">
      {/* Heatmap */}
      <section className="rounded-lg border p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">练习记录</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">过去一年的练习活动</p>
          </div>
          <Link to="/speaking">
            <Button size="sm" className="rounded-full">去练习</Button>
          </Link>
        </div>
        <Heatmap />
      </section>

      {/* Recent practice */}
      <section className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h3 className="text-sm font-semibold">最近练习</h3>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">暂无练习记录</div>
        ) : (
          <div className="divide-y">
            {recent.map(r => (
              <div
                key={r.record_id}
                className="flex cursor-pointer items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors"
                onClick={() => navigate(`/speaking/${r.audio_file_id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.audio_title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{r.sentence_text}</p>
                </div>
                <div className="shrink-0 text-right">
                  {r.accuracy_score != null && (
                    <span className={`text-sm font-semibold tabular-nums ${scoreColor(r.accuracy_score)}`}>
                      {Math.round(r.accuracy_score)}
                    </span>
                  )}
                  <p className="text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
