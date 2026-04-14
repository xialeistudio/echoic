import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import WaveSurfer from 'wavesurfer.js'
import { practiceApi } from '@/api'

/**
 * Manages all recording state: MediaRecorder, live visualizer, user WaveSurfer,
 * A/B compare, practice history, and scoring.
 *
 * @param {object} opts
 * @param {string|number} opts.audioFileId
 * @param {object|null}   opts.selectedSentence
 * @param {React.RefObject} opts.origWsRef  - original audio WaveSurfer ref (for A/B playback)
 */
export function usePracticeRecorder({ audioFileId, selectedSentence, origWsRef }) {
  const { t } = useTranslation()

  const [recPhase, setRecPhase] = useState('idle') // idle | recording | paused | recorded | submitting
  const [recError, setRecError] = useState(null)
  const [userPlaying, setUserPlaying] = useState(false)
  const [currentRecordId, setCurrentRecordId] = useState(null)
  const [history, setHistory] = useState([])
  const [result, setResult] = useState(null)
  const [abPhase, setAbPhase] = useState(null) // null | 'A' | 'B'

  // Refs
  const recBlobRef = useRef(null)
  const recChunksRef = useRef([])
  const recStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const abandonRef = useRef(false)
  const userWsRef = useRef(null)
  const userContainerRef = useRef(null)
  const liveCanvasRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const abPhaseRef = useRef(null)

  useEffect(() => { abPhaseRef.current = abPhase }, [abPhase])

  // User recording WaveSurfer — recreate whenever a new recording finishes
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
    ws.on('finish', () => {
      setUserPlaying(false)
      if (abPhaseRef.current === 'B') setAbPhase(null)
    })
    userWsRef.current = ws
    return () => { ws.destroy(); userWsRef.current = null }
  }, [recPhase])

  // Cleanup mic stream on unmount
  useEffect(() => () => recStreamRef.current?.getTracks().forEach(t => t.stop()), [])

  // ── Live visualizer ──
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

  // ── Recording controls ──
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

  /** Reset all recording + history state when switching sentences. */
  function resetForSentence() {
    resetRec()
    setResult(null)
    setCurrentRecordId(null)
    setHistory([])
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
      setRecError(
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
          ? t('practice.micPermissionDenied')
          : t('practice.micError'),
      )
      return
    }
    recStreamRef.current = stream

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

  function pauseRecording() { mediaRecorderRef.current?.pause(); setRecPhase('paused') }
  function resumeRecording() { mediaRecorderRef.current?.resume(); setRecPhase('recording') }
  function finishRecording() { mediaRecorderRef.current?.stop() }

  // ── A/B compare ──
  function playAB() {
    if (abPhase) {
      origWsRef.current?.pause()
      userWsRef.current?.pause()
      setAbPhase(null)
      return
    }
    if (!userWsRef.current) return
    userWsRef.current.pause()
    origWsRef.current?.seekTo(0)
    setAbPhase('A')
    origWsRef.current?.play()
  }

  // ── Scoring ──
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

  // ── History ──
  async function loadHistoryRecord(record) {
    resetRec()
    setResult(record)
    setCurrentRecordId(record.id)
    const resp = await fetch(practiceApi.recordStreamUrl(record.id))
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

  return {
    // State
    recPhase, recError, userPlaying,
    currentRecordId, setCurrentRecordId,
    history, setHistory,
    result, setResult,
    abPhase, setAbPhase, abPhaseRef,
    // Refs
    recBlobRef, liveCanvasRef,
    userWsRef, userContainerRef,
    // Controls
    startRecording, pauseRecording, resumeRecording, finishRecording,
    resetRec, resetForSentence,
    submitRecording, playAB,
    // History
    loadHistoryRecord, deleteHistoryRecord,
  }
}
