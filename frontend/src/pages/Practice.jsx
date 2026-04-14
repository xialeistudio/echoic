import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import WaveSurfer from 'wavesurfer.js'
import {
  ChevronLeft, ChevronRight, Mic, Play, Pause,
  Loader2, Repeat, Repeat1, Gauge, Download,
  BarChart2, Check, X, ArrowLeftRight, MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import SentenceList from '../components/SentenceList'
import { audioApi, practiceApi } from '@/api'
import { getSegmentBlob } from '@/lib/audioSegment'
import { useSettings } from '@/lib/settings'
import { usePracticeRecorder } from '@/hooks/usePracticeRecorder'
import { SPEEDS, formatTime, rowBtnCls } from './practice/utils'
import WaveformRow from './practice/WaveformRow'
import AnalysisTab from './practice/AnalysisTab'
import HistoryTab from './practice/HistoryTab'

export default function Practice() {
  const { audioFileId } = useParams()
  const { t } = useTranslation()
  const { settings: appSettings } = useSettings()

  // ── Sentence / audio state ──
  const [audioTitle, setAudioTitle] = useState('')
  const [sentences, setSentences] = useState([])
  const [selectedSentence, setSelectedSentence] = useState(null)
  const [phonemes, setPhonemes] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  // ── Original player state ──
  const [origReady, setOrigReady] = useState(false)
  const [origPlaying, setOrigPlaying] = useState(false)
  const [origTime, setOrigTime] = useState(0)
  const [origDur, setOrigDur] = useState(0)
  const [speed, setSpeed] = useState(() => {
    const saved = parseFloat(localStorage.getItem('echoic.playbackSpeed'))
    return SPEEDS.includes(saved) ? saved : 1
  })
  const [loopMode, setLoopMode] = useState('sentence')

  const origWsRef = useRef(null)
  const origContainerRef = useRef(null)
  const loopRef = useRef('sentence')
  const audioCacheRef = useRef(null)
  const origBlobRef = useRef(null)
  const sentencesRef = useRef([])
  const selectedSentenceRef = useRef(null)
  const handleSelectRef = useRef(null)
  const autoPlayOnReadyRef = useRef(false)

  useEffect(() => { loopRef.current = loopMode }, [loopMode])
  useEffect(() => { sentencesRef.current = sentences }, [sentences])
  useEffect(() => { selectedSentenceRef.current = selectedSentence }, [selectedSentence])
  useEffect(() => { handleSelectRef.current = handleSelect })

  // ── Recorder hook ──
  const {
    recPhase, recError, userPlaying,
    recBlobRef, liveCanvasRef,
    userWsRef, userContainerRef,
    currentRecordId,
    history, setHistory,
    result, setResult,
    abPhase, setAbPhase, abPhaseRef,
    startRecording, pauseRecording, resumeRecording, finishRecording,
    resetRec, resetForSentence,
    submitRecording, playAB,
    loadHistoryRecord, deleteHistoryRecord,
  } = usePracticeRecorder({ audioFileId, selectedSentence, origWsRef })

  // ── Create original WaveSurfer once ──
  useEffect(() => {
    if (!origContainerRef.current) return
    const ws = WaveSurfer.create({
      container: origContainerRef.current,
      waveColor: '#7dd3fc',
      progressColor: '#ef4444',
      cursorColor: '#ef4444',
      height: 52,
      barWidth: 2,
      barGap: 1,
      barRadius: 3,
      normalize: true,
    })
    ws.on('ready', () => { setOrigReady(true); setOrigDur(ws.getDuration()) })
    ws.on('play', () => setOrigPlaying(true))
    ws.on('pause', () => setOrigPlaying(false))
    ws.on('timeupdate', t => setOrigTime(t))
    ws.on('finish', () => {
      setOrigPlaying(false)
      if (abPhaseRef.current === 'A') {
        setAbPhase('B')
        userWsRef.current?.seekTo(0)
        userWsRef.current?.play()
        return
      }
      if (loopRef.current === 'sentence') {
        ws.seekTo(0); ws.play()
      } else if (loopRef.current === 'list') {
        const cur = selectedSentenceRef.current
        const sents = sentencesRef.current
        if (cur && sents.length) {
          const i = sents.findIndex(s => s.index === cur.index)
          const next = sents[i + 1]
          if (next) { autoPlayOnReadyRef.current = true; handleSelectRef.current?.(next) }
        }
      }
    })
    origWsRef.current = ws
    return () => { ws.destroy(); origWsRef.current = null }
  }, [])

  // Load sentence-level audio blob when selection changes
  useEffect(() => {
    if (!origWsRef.current || !selectedSentence) return
    setOrigReady(false); setOrigTime(0); setOrigDur(0)
    origWsRef.current.pause()
    const autoPlay = autoPlayOnReadyRef.current
    autoPlayOnReadyRef.current = false
    getSegmentBlob(
      audioApi.streamUrl(audioFileId),
      selectedSentence.start,
      selectedSentence.end,
      audioCacheRef,
    ).then(blob => {
      origBlobRef.current = blob
      const ws = origWsRef.current
      if (!ws) return
      ws.loadBlob(blob)
      if (autoPlay) {
        const unsub = ws.on('ready', () => { unsub(); ws.play() })
      }
    }).catch(console.error)
  }, [selectedSentence?.index, audioFileId])

  useEffect(() => { origWsRef.current?.setPlaybackRate(speed) }, [speed])

  // Cancel A/B when sentence changes
  useEffect(() => {
    if (abPhaseRef.current) {
      origWsRef.current?.pause()
      userWsRef.current?.pause()
      setAbPhase(null)
    }
  }, [selectedSentence?.index])

  // ── Sentence selection ──
  function handleSelect(sentence) {
    const current = sentences.find(s => s.index === sentence.index) ?? sentence
    setSelectedSentence(current)
    setPhonemes([])
    setAnalysis(current.analysis ?? null)
    resetForSentence()
    audioApi.getPhonemes(audioFileId, sentence.index).then(r => setPhonemes(r.data)).catch(() => {})
    practiceApi.getHistory(audioFileId, sentence.index).then(r => setHistory(r.data)).catch(() => {})
  }

  async function handleAnalyze() {
    if (!selectedSentence || analyzing) return
    setAnalyzing(true)
    try {
      const { data } = await audioApi.analyze(audioFileId, selectedSentence.index, { lang: appSettings.nativeLang })
      setAnalysis(data.analysis)
      setSentences(prev => prev.map(s =>
        s.index === selectedSentence.index ? { ...s, analysis: data.analysis } : s
      ))
    } finally {
      setAnalyzing(false)
    }
  }

  function selectRelative(offset) {
    if (!selectedSentence || !sentences.length) return
    const i = sentences.findIndex(s => s.index === selectedSentence.index)
    const next = sentences[i + offset]
    if (next) handleSelect(next)
  }

  function cycleSpeed() {
    const i = SPEEDS.indexOf(speed)
    const next = SPEEDS[(i + 1) % SPEEDS.length]
    setSpeed(next)
    localStorage.setItem('echoic.playbackSpeed', next)
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: filename })
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (recPhase === 'recording' || recPhase === 'paused') return
          origWsRef.current?.playPause()
          break
        case 'KeyR':
          if (e.metaKey || e.ctrlKey) return
          e.preventDefault()
          if (recPhase === 'idle') startRecording()
          else if (recPhase === 'recording') finishRecording()
          break
        case 'Enter':
          if (recPhase === 'recorded' && currentRecordId) {
            e.preventDefault()
            submitRecording()
          }
          break
        case 'ArrowLeft': e.preventDefault(); selectRelative(-1); break
        case 'ArrowRight': e.preventDefault(); selectRelative(1); break
        case 'Escape':
          if (recPhase === 'recording' || recPhase === 'paused') {
            e.preventDefault(); resetRec()
          }
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [recPhase, currentRecordId, selectedSentence, sentences])

  // ── Derived data ──
  const words = useMemo(() => {
    if (result?.word_scores?.length) {
      return result.word_scores.map(ws => ({
        text: ws.word, ipa: ws.expected_phonemes || null, score: ws.accuracy_score,
      }))
    }
    if (selectedSentence) {
      const wordTexts = selectedSentence.words?.length
        ? selectedSentence.words.map(w => w.word)
        : selectedSentence.text.trim().split(/\s+/)
      return wordTexts.map((t, i) => ({ text: t, ipa: phonemes[i]?.ipa ?? null, score: null }))
    }
    return []
  }, [result, selectedSentence, phonemes])

  const activeWordIndex = useMemo(() => {
    if (words.length === 0 || (!origPlaying && origTime === 0)) return -1
    const sentenceWords = !result && selectedSentence?.words
    if (sentenceWords?.length === words.length) {
      const absTime = origTime + (selectedSentence.start ?? 0)
      let active = -1
      for (let i = 0; i < sentenceWords.length; i++) {
        if (absTime >= sentenceWords[i].start) active = i
      }
      return active
    }
    if (origDur <= 0) return -1
    return Math.max(-1, Math.min(Math.floor((origTime / origDur) * words.length - 0.5), words.length - 1))
  }, [origPlaying, origTime, origDur, words, result, selectedSentence])

  const selectedIndex = selectedSentence
    ? sentences.findIndex(s => s.index === selectedSentence.index)
    : -1

  const wordSummary = useMemo(() => {
    const map = {}
    for (const record of history) {
      if (!record.word_scores?.length) continue
      for (const ws of record.word_scores) {
        if (!map[ws.word]) map[ws.word] = []
        map[ws.word].push(ws.accuracy_score)
      }
    }
    return Object.entries(map)
      .map(([word, scores]) => ({
        word,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      }))
      .sort((a, b) => a.avg - b.avg)
  }, [history])

  // ── Action button arrays ──
  const origActions = [
    <Tooltip key="dl">
      <TooltipTrigger
        className={rowBtnCls}
        disabled={!origBlobRef.current}
        onClick={() => origBlobRef.current && downloadBlob(origBlobRef.current, `sentence-${selectedSentence?.index ?? 0}.wav`)}>
        <Download className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="left">{t('practice.downloadOriginal')}</TooltipContent>
    </Tooltip>,
    <div key="pad" />,
    <div key="pad2" />,
  ]

  const recActions = (recPhase === 'recorded' || recPhase === 'submitting') ? [
    <Tooltip key="mic">
      <TooltipTrigger className={`${rowBtnCls} text-rose-400 hover:text-rose-500`} disabled={!selectedSentence} onClick={startRecording}>
        <Mic className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="left">{t('practice.reRecord')}</TooltipContent>
    </Tooltip>,
    <Tooltip key="play">
      <TooltipTrigger className={rowBtnCls} onClick={() => userWsRef.current?.playPause()}>
        {userPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </TooltipTrigger>
      <TooltipContent side="left">{userPlaying ? t('practice.pause') : t('practice.playRecording')}</TooltipContent>
    </Tooltip>,
    <Tooltip key="ab">
      <TooltipTrigger className={`${rowBtnCls} ${abPhase ? 'text-primary' : ''}`} disabled={!origReady} onClick={playAB}>
        <ArrowLeftRight className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="left">
        {abPhase === 'A' ? t('practice.abPlayingOrig') : abPhase === 'B' ? t('practice.abPlayingRec') : t('practice.abCompare')}
      </TooltipContent>
    </Tooltip>,
    <DropdownMenu key="more">
      <DropdownMenuTrigger className={rowBtnCls}>
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="end">
        <DropdownMenuItem disabled={recPhase === 'submitting' || !currentRecordId} closeOnClick={false} onClick={submitRecording}>
          {recPhase === 'submitting' ? <Loader2 className="size-4 animate-spin" /> : <BarChart2 className="size-4" />}
          {t('practice.assess')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!recBlobRef.current}
          onClick={() => recBlobRef.current && downloadBlob(recBlobRef.current, `recording-${selectedSentence?.index ?? 0}.webm`)}>
          <Download className="size-4" />
          {t('practice.downloadRecording')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  ] : []

  // ── Render ──
  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Breadcrumb */}
        <div className="flex h-10 shrink-0 items-center gap-2 border-b px-5 text-sm text-muted-foreground">
          <Link to="/speaking" className="flex items-center gap-1 transition-colors hover:text-foreground">
            <ChevronLeft className="size-4" />
            {t('nav.speaking')}
          </Link>
          {audioTitle && (<><span className="text-border">/</span>
            <span className="max-w-xs truncate text-foreground">{audioTitle}</span></>)}
        </div>

        {/* Main panels */}
        <div className="mx-4 mt-3 flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border/40 bg-background flex-row">
          {/* Left: sentence list */}
          <section className="flex min-h-0 h-full basis-2/5 flex-col border-r border-border/40">
            <div className="flex items-center justify-between border-b border-border/30 px-3 py-2 shrink-0">
              <span className="text-sm font-medium">{t('practice.sentences')}</span>
              <span className="tabular-nums text-[11px] text-muted-foreground">
                #{Math.max(selectedIndex + 1, 1)}/{Math.max(sentences.length, 1)}
              </span>
            </div>
            <SentenceList
              audioFileId={audioFileId}
              onSelect={handleSelect}
              selectedIndex={selectedSentence?.index ?? null}
              onTitleLoad={(title, sents) => { setAudioTitle(title); setSentences(sents); if (sents.length) handleSelect(sents[0]) }}
            />
          </section>

          {/* Right: tabs */}
          <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
            <Tabs defaultValue="translation" className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-border/40 px-3 py-2">
                <TabsList className="grid h-8 w-full grid-cols-2 bg-muted/50">
                  <TabsTrigger value="translation">{t('practice.analysis')}</TabsTrigger>
                  <TabsTrigger value="practice">{t('practice.myPractice')}</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="translation" className="mt-0 flex-1 overflow-y-auto px-5 py-5 data-[state=inactive]:hidden">
                <AnalysisTab
                  selectedSentence={selectedSentence}
                  words={words}
                  activeWordIndex={activeWordIndex}
                  analysis={analysis}
                  analyzing={analyzing}
                  onAnalyze={handleAnalyze}
                />
              </TabsContent>
              <TabsContent value="practice" className="mt-0 flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
                <HistoryTab
                  history={history}
                  currentRecordId={currentRecordId}
                  result={result}
                  wordSummary={wordSummary}
                  selectedSentence={selectedSentence}
                  onLoadRecord={loadHistoryRecord}
                  onDeleteRecord={deleteHistoryRecord}
                />
              </TabsContent>
            </Tabs>
          </section>
        </div>

        {/* Bottom: waveforms + controls */}
        <div className="shrink-0 border-t border-border/30 bg-muted/5 px-5 py-3">
          <div className="space-y-2.5">
            {/* User recording row */}
            {(recPhase === 'recording' || recPhase === 'paused') ? (
              <div className="min-h-[72px] flex items-center justify-center gap-3 overflow-hidden rounded-lg border border-border/30 bg-muted/5">
                <canvas
                  ref={liveCanvasRef}
                  className={`shrink-0 transition-opacity ${recPhase === 'paused' ? 'opacity-40' : ''}`}
                  width={160} height={40}
                />
                <div className="flex shrink-0 items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" onClick={resetRec}>
                      <X className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent side="top">{t('practice.discardRecording')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      className={`inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-accent ${recPhase === 'paused' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={recPhase === 'paused' ? resumeRecording : pauseRecording}>
                      {recPhase === 'paused' ? <Play className="size-4" /> : <Pause className="size-4" />}
                    </TooltipTrigger>
                    <TooltipContent side="top">{recPhase === 'paused' ? t('practice.continueRecording') : t('practice.pause')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger className="inline-flex size-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-accent" onClick={finishRecording}>
                      <Check className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent side="top">{t('practice.finishRecording')}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ) : (
              <WaveformRow
                containerRef={userContainerRef}
                actions={recActions}
                emptyState={
                  recPhase === 'idle'
                    ? recError
                      ? (
                        <button type="button" onClick={startRecording} className="flex h-full w-full flex-col items-center justify-center gap-1">
                          <p className="text-[11px] font-medium text-red-500">{recError}</p>
                          <p className="text-[10px] text-muted-foreground/60">{t('practice.tapToRetry')}</p>
                        </button>
                      ) : (
                        <button type="button" disabled={!selectedSentence} onClick={startRecording} className="flex h-full w-full flex-col items-center justify-center gap-1 disabled:opacity-40">
                          <Mic className="size-5 text-rose-400" />
                          <p className="text-[11px] text-muted-foreground/60">
                            {selectedSentence ? t('practice.clickToRecord') : t('practice.selectFirst')}
                          </p>
                        </button>
                      )
                    : null
                }
              />
            )}

            {/* Original audio row */}
            <WaveformRow
              label={origDur > 0 ? `${formatTime(origTime)} / ${formatTime(origDur)}` : ''}
              detail={!origReady && selectedSentence ? t('practice.loading') : ''}
              containerRef={origContainerRef}
              actions={origActions}
            />

            {/* Playback controls */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setLoopMode(m => m === 'sentence' ? 'list' : 'sentence')}>
                  {loopMode === 'sentence' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
                </TooltipTrigger>
                <TooltipContent>{loopMode === 'sentence' ? t('practice.loopSentence') : t('practice.loopList')}</TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" className="size-8" disabled={selectedIndex <= 0} onClick={() => selectRelative(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                size="icon"
                className="size-11 rounded-full bg-foreground text-background shadow-md transition-transform hover:bg-foreground/90 active:scale-95"
                disabled={!origReady}
                onClick={() => origWsRef.current?.playPause()}
              >
                {origPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="size-8"
                disabled={selectedIndex === -1 || selectedIndex >= sentences.length - 1}
                onClick={() => selectRelative(1)}>
                <ChevronRight className="size-4" />
              </Button>
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={cycleSpeed}>
                  <Gauge className="size-4" />
                  <span className="tabular-nums text-xs">{speed % 1 === 0 ? speed.toFixed(1) : speed}x</span>
                </TooltipTrigger>
                <TooltipContent>{t('practice.playbackSpeed')}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
