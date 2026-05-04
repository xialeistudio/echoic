import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, RefreshCw, Mic, Square, Loader2, AlertCircle, Info, Sparkles, CheckCircle, RotateCcw } from 'lucide-react'
import { useOralPractice } from '@/hooks/useOralPractice'
import ScoreCard from '@/components/ScoreCard'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const PRACTICE_LANGS = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
]

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const DEFAULT_SECS = {
  read_aloud: 30, situational: 15, picture_describe: 60,
  quick_response: 8, monologue: 60,
}

function scoreColor(s) {
  if (s >= 80) return '#16a34a'
  if (s >= 50) return '#ca8a04'
  return '#ef4444'
}

function ScoreRing({ value, label, size = 60 }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  const color = scoreColor(value)
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="13" fontWeight="600" fill={color}>
          {Math.round(value)}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default function OralPractice() {
  const { type } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [language, setLanguage] = useState('en')
  const [difficulty, setDifficulty] = useState('intermediate')

  const {
    phase, editableText, setEditableText, result, error,
    timerEnabled, setTimerEnabled, timerSecs, setTimerSecs,
    countdown, liveCanvasRef,
    generateQuestion, resetPractice, startRecording, stopRecording,
    submitRecording, cancelRecording,
  } = useOralPractice({ questionType: type, language, difficulty })

  useEffect(() => {
    setTimerSecs(DEFAULT_SECS[type] ?? 30)
  }, [type])

  const isReadAloud = type === 'read_aloud'
  const canStart = editableText.trim().length > 0
  const isInputPhase = phase === 'idle' || phase === 'generating'
  const isRecordedPhase = phase === 'recorded'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/60 shrink-0">
        <button
          onClick={() => navigate('/oral')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('oral.title')}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
        <span className="text-sm text-foreground font-medium">{t(`oral.types.${type}.name`)}</span>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Editable input — shown before recording starts */}
        {isInputPhase && (
          <div className="flex flex-col gap-2">
            <textarea
              value={editableText}
              onChange={e => setEditableText(e.target.value)}
              disabled={phase === 'generating'}
              placeholder={t(isReadAloud ? 'oral.placeholderReadAloud' : 'oral.placeholderPrompt')}
              rows={5}
              className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={generateQuestion}
              disabled={phase === 'generating'}
              className="self-start gap-1.5 text-muted-foreground hover:text-foreground"
            >
              {phase === 'generating'
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('oral.generating')}</>
                : <><Sparkles className="w-3.5 h-3.5" />{canStart ? t('oral.regenerate') : t('oral.generateQuestion')}</>
              }
            </Button>
          </div>
        )}

        {/* Question text shown during recording / scoring */}
        {!isInputPhase && phase !== 'scored' && (
          <div className="rounded-xl border border-border/60 bg-card p-4">
            {isReadAloud ? (
              <div className="bg-muted rounded-lg p-3 text-sm text-foreground leading-relaxed border-l-4 border-primary">
                {editableText}
              </div>
            ) : (
              <p className="text-sm font-medium text-foreground leading-relaxed">{editableText}</p>
            )}
          </div>
        )}

        {/* Post-recording actions */}
        {isRecordedPhase && (
          <div className="flex gap-2">
            <Button onClick={submitRecording} className="flex-1 gap-2">
              <CheckCircle className="w-4 h-4" />
              {t('oral.submitScore')}
            </Button>
            <Button onClick={cancelRecording} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              {t('oral.reRecord')}
            </Button>
          </div>
        )}

        {/* Recording controls */}
        {['idle', 'recording', 'submitting'].includes(phase) && (
          <div className="flex flex-col gap-3">
            {phase === 'recording' && (
              <div className="h-14 rounded-lg bg-muted overflow-hidden">
                <canvas ref={liveCanvasRef} className="w-full h-full" width={600} height={56} />
              </div>
            )}

            {(phase === 'idle' || phase === 'recording') && (
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    id="timer-switch"
                    checked={timerEnabled}
                    onCheckedChange={setTimerEnabled}
                    disabled={phase === 'recording'}
                    size="sm"
                  />
                  <Label htmlFor="timer-switch" className="text-xs text-muted-foreground cursor-pointer font-normal">
                    {t('oral.timerOn')}
                  </Label>
                </div>

                {timerEnabled && phase !== 'recording' && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={3}
                      max={300}
                      value={timerSecs}
                      onChange={e => setTimerSecs(Math.max(3, Number(e.target.value)))}
                      className="w-16 text-center border border-border rounded-md px-1.5 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">{t('oral.seconds')}</span>
                  </div>
                )}

                {phase === 'recording' && timerEnabled && (
                  <>
                    <Progress value={(countdown / timerSecs) * 100} className="flex-1 h-1.5" />
                    <span className="text-xs font-mono text-foreground shrink-0 tabular-nums">{countdown}s</span>
                  </>
                )}
              </div>
            )}

            {phase === 'idle' && (
              <Button onClick={startRecording} disabled={!canStart} className="gap-2">
                <Mic className="w-4 h-4" />
                {t('oral.startRecording')}
              </Button>
            )}
            {phase === 'recording' && (
              <Button onClick={stopRecording} variant="destructive" className="gap-2">
                <Square className="w-4 h-4 fill-current" />
                {t('oral.stopRecording')}
              </Button>
            )}
            {phase === 'submitting' && (
              <Button disabled className="gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('oral.scoring')}
              </Button>
            )}
          </div>
        )}

        {/* Score result */}
        {phase === 'scored' && result && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              {isReadAloud ? (
                <ScoreCard result={result} />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-around py-2">
                    {result.accuracy_score != null && (
                      <ScoreRing value={result.accuracy_score} label={t('score.accuracy')} />
                    )}
                    {result.fluency_score != null && (
                      <ScoreRing value={result.fluency_score} label={t('score.fluency')} />
                    )}
                    {result.llm_score != null && (
                      <ScoreRing value={result.llm_score} label={t('oral.contentScore')} />
                    )}
                  </div>

                  {result.transcription && (
                    <div className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                      <span className="font-medium">{t('oral.transcript')}:</span>{' '}
                      {result.transcription}
                    </div>
                  )}

                  {result.llm_feedback && (
                    <p className="text-sm text-foreground leading-relaxed">{result.llm_feedback}</p>
                  )}

                  {result.llm_highlights?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {result.llm_highlights.map((h, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/40">
                    <Info className="w-3 h-3 shrink-0" />
                    {t('oral.scoringNote')}
                  </p>
                </div>
              )}
            </div>

            <Button variant="outline" onClick={resetPractice} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {t('oral.practiceAgain')}
            </Button>
          </div>
        )}

        {/* Language + Difficulty selectors */}
        {isInputPhase && (
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[130px] h-9 text-sm">
                <SelectValue>{PRACTICE_LANGS.find(l => l.value === language)?.label ?? language}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PRACTICE_LANGS.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-[100px] h-9 text-sm">
                <SelectValue>{t(`oral.difficulty.${difficulty}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map(d => (
                  <SelectItem key={d} value={d}>{t(`oral.difficulty.${d}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
