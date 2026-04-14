import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import WaveSurfer from 'wavesurfer.js'
import {
  ChevronLeft, ChevronRight, Mic, Play, Pause,
  Loader2, Repeat, Repeat1, Gauge, Download,
  BarChart2, Check, X, Trash2,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import SentenceList from '../components/SentenceList'
import ScoreCard from '../components/ScoreCard'
import { audioApi, practiceApi } from '@/api'
import { getSegmentBlob } from '@/lib/audioSegment'
import { useSettings } from '@/lib/settings'
import Markdown from 'react-markdown'

const SPEEDS = [0.5, 1, 1.5, 2]

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function scoreColor(score) {
  if (score >= 80) return 'text-green-500'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

function WordIpaRow({ words, activeIndex }) {
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

// WaveformRow
function WaveformRow({ label, detail, containerRef, emptyState, actions }) {
  const hasActions = actions?.length > 0
  return (
    <div
      className="min-h-[72px] overflow-hidden rounded-lg border border-border/30 bg-muted/5"
      style={hasActions ? { display: 'grid', gridTemplateColumns: '1fr 36px' } : undefined}
    >
      <div className="min-w-0 px-3.5 py-2">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>{detail ?? ''}</span>
          <span>{label ?? ''}</span>
        </div>
        <div className="relative h-[52px] overflow-hidden">
          {emptyState ?? <div ref={containerRef} className="h-full" />}
        </div>
      </div>
      {hasActions && (
        <div className="grid items-stretch border-l border-border/30" style={{ gridTemplateRows: `repeat(${actions.length}, 1fr)` }}>
          {actions.map((action, i) => (
            <div key={i} className="flex items-stretch">{action}</div>
          ))}
        </div>
      )}
    </div>
  )
}

const rowBtnCls = 'h-full w-full flex items-center justify-center rounded-none text-muted-foreground hover:text-foreground'

export default function Practice() {
  const { audioFileId } = useParams()
  const { t } = useTranslation()

  const { settings: appSettings } = useSettings()

  const [audioTitle, setAudioTitle] = useState('')
  const [sentences, setSentences] = useState([])
  const [selectedSentence, setSelectedSentence] = useState(null)
  const [result, setResult] = useState(null)
  const [currentRecordId, setCurrentRecordId] = useState(null)
  const [phonemes, setPhonemes] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [history, setHistory] = useState([])

  // ── Original player ──
  const [origReady, setOrigReady] = useState(false)
  const [origPlaying, setOrigPlaying] = useState(false)
  const [origTime, setOrigTime] = useState(0)
  const [origDur, setOrigDur] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [loopMode, setLoopMode] = useState('sentence')
  const origWsRef = useRef(null)
  const origContainerRef = useRef(null)
  const loopRef = useRef('sentence')
  const audioCacheRef = useRef(null)
  const origBlobRef = useRef(null)  // for download
  const sentencesRef = useRef([])
  const selectedSentenceRef = useRef(null)
  const handleSelectRef = useRef(null)
  const autoPlayOnReadyRef = useRef(false)
  useEffect(() => { loopRef.current = loopMode }, [loopMode])
  useEffect(() => { sentencesRef.current = sentences }, [sentences])
  useEffect(() => { selectedSentenceRef.current = selectedSentence }, [selectedSentence])
  useEffect(() => { handleSelectRef.current = handleSelect })

  // ── Recording ──
  const [recPhase, setRecPhase] = useState('idle') // idle | recording | paused | recorded | submitting
  const [recError, setRecError] = useState(null)
  const [userPlaying, setUserPlaying] = useState(false)
  const recBlobRef = useRef(null)
  const recChunksRef = useRef([])
  const recStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const abandonRef = useRef(false)
  const userWsRef = useRef(null)
  const userContainerRef = useRef(null)

  // ── Live recording visualizer ──
  const liveCanvasRef = useRef(null)
  const analyserRef = useRef(null)   // { analyser, audioCtx }
  const animFrameRef = useRef(null)

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
    ws.on('ready', () => {
      setOrigReady(true)
      setOrigDur(ws.getDuration())
    })
    ws.on('play', () => setOrigPlaying(true))
    ws.on('pause', () => setOrigPlaying(false))
    ws.on('timeupdate', t => setOrigTime(t))
    ws.on('finish', () => {
      setOrigPlaying(false)
      if (loopRef.current === 'sentence') {
        ws.seekTo(0); ws.play()
      } else if (loopRef.current === 'list') {
        const cur = selectedSentenceRef.current
        const sents = sentencesRef.current
        if (cur && sents.length) {
          const i = sents.findIndex(s => s.index === cur.index)
          const next = sents[i + 1]
          if (next) {
            autoPlayOnReadyRef.current = true
            handleSelectRef.current?.(next)
          }
        }
      }
    })
    origWsRef.current = ws
    return () => { ws.destroy(); origWsRef.current = null }
  }, [])

  // Load sentence-level audio blob when sentence changes
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

  // User recording WaveSurfer — recreate when recording finishes
  useEffect(() => {
    if (recPhase !== 'recorded' || !recBlobRef.current || !userContainerRef.current) return
    const ws = WaveSurfer.create({
      container: userContainerRef.current,
      waveColor: '#fda4af',
      progressColor: '#f43f5e',
      cursorColor: 'transparent',
      height: 52,
      barWidth: 2,
      barGap: 1,
      barRadius: 3,
    })
    ws.loadBlob(recBlobRef.current)
    ws.on('play', () => setUserPlaying(true))
    ws.on('pause', () => setUserPlaying(false))
    ws.on('finish', () => setUserPlaying(false))
    userWsRef.current = ws
    return () => { ws.destroy(); userWsRef.current = null }
  }, [recPhase])

  useEffect(() => () => recStreamRef.current?.getTracks().forEach(t => t.stop()), [])

  // ── Live visualizer draw loop ──
  const drawLive = useCallback(() => {
    animFrameRef.current = requestAnimationFrame(drawLive)
    const canvas = liveCanvasRef.current
    const ref = analyserRef.current
    if (!canvas || !ref) return
    const { analyser } = ref
    const data = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(data)
    const ctx = canvas.getContext('2d')
    const { width: w, height: h } = canvas
    ctx.clearRect(0, 0, w, h)
    const barW = 2, gap = 1, step = barW + gap
    const numBars = Math.floor(w / step)
    const sampleStep = Math.floor(data.length / numBars)
    const cy = h / 2
    for (let i = 0; i < numBars; i++) {
      const v = Math.abs((data[i * sampleStep] ?? 128) - 128) / 128
      const barH = Math.max(2, v * h)
      ctx.fillStyle = `rgba(253, 164, 175, ${0.4 + 0.6 * v})`
      ctx.fillRect(i * step, cy - barH / 2, barW, barH)
    }
  }, [])

  function stopLiveViz() {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null }
    if (analyserRef.current) { analyserRef.current.audioCtx.close(); analyserRef.current = null }
    const canvas = liveCanvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }

  // ── Sentence selection ──
  function handleSelect(sentence) {
    const current = sentences.find(s => s.index === sentence.index) ?? sentence
    setSelectedSentence(current)
    setResult(null)
    setCurrentRecordId(null)
    setPhonemes([])
    setAnalysis(current.analysis ?? null)
    setHistory([])
    resetRec()
    audioApi.getPhonemes(audioFileId, sentence.index)
      .then(r => setPhonemes(r.data)).catch(() => {})
    practiceApi.getHistory(audioFileId, sentence.index)
      .then(r => setHistory(r.data)).catch(() => {})
  }

  function resetRec() {
    stopLiveViz()
    const mr = mediaRecorderRef.current
    if (mr && (mr.state === 'recording' || mr.state === 'paused')) {
      abandonRef.current = true
      mr.stop()
    }
    recBlobRef.current = null
    recChunksRef.current = []
    recStreamRef.current?.getTracks().forEach(t => t.stop())
    recStreamRef.current = null
    setRecError(null)
    setRecPhase('idle')
  }

  async function startRecording() {
    if (!selectedSentence) return
    setRecError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecError(t('practice.micNotSupported'))
      return
    }
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: { ideal: 16000 }, channelCount: { ideal: 1 } },
      })
    } catch (err) {
      const msg = (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        ? t('practice.micPermissionDenied')
        : t('practice.micError')
      setRecError(msg)
      return
    }
    recStreamRef.current = stream

    // Setup live visualizer
    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 128
    source.connect(analyser)
    analyserRef.current = { analyser, audioCtx }
    animFrameRef.current = requestAnimationFrame(drawLive)

    const mr = new MediaRecorder(stream)
    mediaRecorderRef.current = mr
    recChunksRef.current = []
    mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data) }
    mr.onstop = () => {
      if (abandonRef.current) { abandonRef.current = false; return }
      stopLiveViz()
      const blob = new Blob(recChunksRef.current, { type: 'audio/webm' })
      recBlobRef.current = blob
      recStreamRef.current?.getTracks().forEach(t => t.stop())
      recStreamRef.current = null
      setRecPhase('recorded')
      // Auto-save (no scoring)
      practiceApi.saveRecording(audioFileId, selectedSentence.index, blob)
        .then(({ data }) => {
          setCurrentRecordId(data.id)
          practiceApi.getHistory(audioFileId, selectedSentence.index)
            .then(r => setHistory(r.data)).catch(() => {})
        })
        .catch(() => {})
    }
    mr.start()
    setRecPhase('recording')
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  function pauseRecording() {
    mediaRecorderRef.current?.pause()
    setRecPhase('paused')
  }

  function resumeRecording() {
    mediaRecorderRef.current?.resume()
    setRecPhase('recording')
  }

  function finishRecording() {
    mediaRecorderRef.current?.stop()
  }

  async function submitRecording() {
    if (!currentRecordId) return
    setRecPhase('submitting')
    setRecError(null)
    try {
      const { data } = await practiceApi.scoreRecording(currentRecordId)
      setResult(data)
      practiceApi.getHistory(audioFileId, selectedSentence.index)
        .then(r => setHistory(r.data)).catch(() => {})
    } catch (err) {
      setRecError(err.response?.data?.detail ?? err.message ?? t('practice.scoreFailed'))
    }
    setRecPhase('recorded')
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  function selectRelative(offset) {
    if (!selectedSentence || !sentences.length) return
    const i = sentences.findIndex(s => s.index === selectedSentence.index)
    const next = sentences[i + offset]
    if (next) handleSelect(next)
  }

  function cycleSpeed() {
    const i = SPEEDS.indexOf(speed)
    setSpeed(SPEEDS[(i + 1) % SPEEDS.length])
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKey(e) {
      // Ignore when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (recPhase === 'recording' || recPhase === 'paused') return
          origWsRef.current?.playPause()
          break
        case 'KeyR':
          if (e.metaKey || e.ctrlKey) return // don't hijack browser refresh
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
        case 'ArrowLeft':
          e.preventDefault()
          selectRelative(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          selectRelative(1)
          break
        case 'Escape':
          if (recPhase === 'recording' || recPhase === 'paused') {
            e.preventDefault()
            resetRec()
          }
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [recPhase, currentRecordId, selectedSentence, sentences])

  async function loadHistoryRecord(record) {
    resetRec()
    setResult(record)
    setCurrentRecordId(record.id)
    const url = practiceApi.recordStreamUrl(record.id)
    const resp = await fetch(url)
    if (!resp.ok) return
    recBlobRef.current = await resp.blob()
    setRecPhase('recorded')
  }

  async function deleteHistoryRecord(e, record) {
    e.stopPropagation()
    await practiceApi.deleteRecord(record.id).catch(() => {})
    if (currentRecordId === record.id) {
      setResult(null)
      setCurrentRecordId(null)
      resetRec()
    }
    setHistory(h => h.filter(r => r.id !== record.id))
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

  // ── Word list ──
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
    if (words.length === 0) return -1
    // No highlight before playback starts
    if (!origPlaying && origTime === 0) return -1
    // Use actual ASR word timestamps when no scored result
    const sentenceWords = !result && selectedSentence?.words
    if (sentenceWords?.length === words.length) {
      const absTime = origTime + (selectedSentence.start ?? 0)
      let active = -1
      for (let i = 0; i < sentenceWords.length; i++) {
        if (absTime >= sentenceWords[i].start) active = i
      }
      return active
    }
    // Fallback: uniform distribution
    if (origDur <= 0) return -1
    const idx = Math.floor((origTime / origDur) * words.length - 0.5)
    return Math.max(-1, Math.min(idx, words.length - 1))
  }, [origPlaying, origTime, origDur, words, result, selectedSentence])

  const selectedIndex = selectedSentence
    ? sentences.findIndex(s => s.index === selectedSentence.index)
    : -1

  // ── Original row actions ──
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

  // ── Recording row actions ──
  const recActions = (recPhase === 'recorded' || recPhase === 'submitting') ? [
    <Tooltip key="mic">
      <TooltipTrigger
        className={`${rowBtnCls} text-rose-400 hover:text-rose-500`}
        disabled={!selectedSentence} onClick={startRecording}>
        <Mic className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="left">{t('practice.reRecord')}</TooltipContent>
    </Tooltip>,
    <Tooltip key="play">
      <TooltipTrigger className={rowBtnCls}
        onClick={() => userWsRef.current?.playPause()}>
        {userPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </TooltipTrigger>
      <TooltipContent side="left">{userPlaying ? t('practice.pause') : t('practice.playRecording')}</TooltipContent>
    </Tooltip>,
    <Tooltip key="score">
      <TooltipTrigger className={rowBtnCls}
        disabled={recPhase === 'submitting' || !currentRecordId}
        onClick={submitRecording}>
        {recPhase === 'submitting'
          ? <Loader2 className="size-4 animate-spin" />
          : <BarChart2 className="size-4" />}
      </TooltipTrigger>
      <TooltipContent side="left">{t('practice.assess')}</TooltipContent>
    </Tooltip>,
    <Tooltip key="dl">
      <TooltipTrigger className={rowBtnCls}
        disabled={!recBlobRef.current}
        onClick={() => recBlobRef.current && downloadBlob(recBlobRef.current, `recording-${selectedSentence?.index ?? 0}.webm`)}>
        <Download className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="left">{t('practice.downloadRecording')}</TooltipContent>
    </Tooltip>,
  ] : []

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
            <span className="max-w-xs truncate text-foreground">{audioTitle}</span></>
          )}
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
                <div className="mb-4">
                  {selectedSentence ? (
                    <WordIpaRow words={words} activeIndex={activeWordIndex} />
                  ) : (
                    <p className="text-sm text-muted-foreground/50">{t('practice.selectSentence')}</p>
                  )}
                </div>
                {selectedSentence && (
                  <div className="border-t border-border/20 pt-4">
                    {analysis ? (
                      <div className="text-sm text-foreground/80 [&_h1]:mb-1 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_p]:my-1 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4">
                        <Markdown>{analysis}</Markdown>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" disabled={analyzing}
                        onClick={handleAnalyze} className="gap-1.5">
                        {analyzing && <Loader2 className="size-3.5 animate-spin" />}
                        {t('practice.analyzeSentence')}
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="practice" className="mt-0 flex-1 flex flex-col min-h-0 data-[state=inactive]:hidden">
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
                            onClick={() => loadHistoryRecord(r)}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-[11px] text-muted-foreground">
                                {new Date(r.created_at).toLocaleString('zh-CN')}
                              </p>
                              <button
                                className="text-muted-foreground/50 hover:text-destructive transition-colors"
                                onClick={e => deleteHistoryRecord(e, r)}
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

                {/* Detail panel */}
                {result?.accuracy_score != null && (
                  <div className="shrink-0 max-h-[55%] overflow-y-auto border-t border-border/30 px-5 py-4">
                    <ScoreCard result={result} />
                  </div>
                )}
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
                  width={160}
                  height={40}
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
                  recPhase === 'idle' ? (
                    recError ? (
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
                  ) : null
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

              <Button variant="ghost" size="icon" className="size-8"
                disabled={selectedIndex <= 0} onClick={() => selectRelative(-1)}>
                <ChevronLeft className="size-4" />
              </Button>

              {/* Play original */}
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
