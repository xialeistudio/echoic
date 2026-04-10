import { useTranslation } from "react-i18next"
import { Progress } from "@/components/ui/progress"

function scoreColor(score) {
  if (score >= 80) return "text-green-600"
  if (score >= 50) return "text-yellow-600"
  return "text-red-500"
}

function progressColor(score) {
  if (score >= 80) return "bg-green-500"
  if (score >= 50) return "bg-yellow-500"
  return "bg-red-500"
}

function chipBg(score) {
  if (score >= 80) return "bg-green-100 text-green-800 border border-green-300"
  if (score >= 50) return "bg-yellow-100 text-yellow-800 border border-yellow-300"
  return "bg-red-100 text-red-800 border border-red-300"
}

// Render expected_phonemes with per-phoneme coloring from phoneme_scores.
// Stress markers (ˈˌ) are shown in muted grey; actual phoneme chars are
// colored by their score. phoneme_scores[i] maps to the i-th non-stress char.
function PhonemeBar({ expected, scores }) {
  if (!expected) return null

  const STRESS = new Set(["ˈ", "ˌ"])
  let scoreIdx = 0
  const chars = [...expected] // split by Unicode code point

  return (
    <span className="font-[family-name:var(--font-ipa)] text-xs tracking-wide">
      {chars.map((ch, i) => {
        if (STRESS.has(ch)) {
          return <span key={i} className="text-muted-foreground/50">{ch}</span>
        }
        const score = scores?.[scoreIdx] ?? null
        scoreIdx++
        const cls = score === null ? "text-muted-foreground" : scoreColor(score)
        return <span key={i} className={cls}>{ch}</span>
      })}
    </span>
  )
}

function ScoreGauge({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${scoreColor(value)}`}>{Math.round(value)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${progressColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export default function ScoreCard({ result }) {
  const { t } = useTranslation()
  if (!result) return null

  const { accuracy_score, fluency_score, completeness_score, word_scores } = result
  const words = word_scores ?? []

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-semibold text-foreground">{t('score.title')}</p>

      <div className="flex flex-col gap-3">
        <ScoreGauge label={t('score.accuracy')} value={accuracy_score} />
        <ScoreGauge label={t('score.fluency')} value={fluency_score} />
        <ScoreGauge label={t('score.completeness')} value={completeness_score} />
      </div>

      {words.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-2 border-t">
          {words.map((ws, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={`rounded-md px-2 py-1 text-sm font-medium ${chipBg(ws.accuracy_score)}`}>
                {ws.word}
              </span>
              <PhonemeBar
                expected={ws.expected_phonemes}
                scores={ws.phoneme_scores}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
