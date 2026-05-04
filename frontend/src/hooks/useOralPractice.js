import { useState, useRef, useEffect, useCallback } from 'react'
import { oralApi } from '@/api'

// phases: idle → generating → idle(text ready) → recording → submitting → scored
export function useOralPractice({ questionType, language, difficulty, topic } = {}) {
  const [phase, setPhase] = useState('idle')
  const [editableText, setEditableText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const [timerEnabled, setTimerEnabled] = useState(true)
  const [timerSecs, setTimerSecs] = useState(30)
  const [countdown, setCountdown] = useState(0)

  const liveCanvasRef = useRef(null)
  const recBlobRef = useRef(null)
  const recChunksRef = useRef([])
  const recStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const timerRef = useRef(null)
  const stopRecordingRef = useRef(null)
  // Effective question captured at recording start — avoids stale closure in submitRecording
  const pendingQuestionRef = useRef(null)
  // For read_aloud: LLM-generated instruction prompt (not user-editable)
  const llmPromptRef = useRef('')

  useEffect(() => {
    return () => {
      recStreamRef.current?.getTracks().forEach(t => t.stop())
      cancelAnimationFrame(animFrameRef.current)
      clearInterval(timerRef.current)
    }
  }, [])

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
    const bucketSize = Math.floor(data.length / numBars)
    for (let i = 0; i < numBars; i++) {
      let sum = 0
      for (let j = 0; j < bucketSize; j++) sum += Math.abs(data[i * bucketSize + j] - 128)
      const avg = sum / bucketSize
      const barH = Math.max(2, (avg / 128) * h * 2.5)
      const x = i * step
      const y = (h - barH) / 2
      ctx.fillStyle = '#f43f5e'
      ctx.beginPath()
      ctx.roundRect(x, y, barW, barH, 1)
      ctx.fill()
    }
  }, [])

  const generateQuestion = useCallback(async () => {
    setPhase('generating')
    setResult(null)
    setError(null)
    try {
      const res = await oralApi.generateQuestion({ questionType, language, difficulty, topic })
      const q = res.data
      llmPromptRef.current = q.prompt ?? ''
      // For read_aloud the editable part is reference_text; for others it's the prompt
      setEditableText(questionType === 'read_aloud' ? (q.reference_text ?? '') : (q.prompt ?? ''))
      setPhase('idle')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to generate question')
      setPhase('idle')
    }
  }, [questionType, language, difficulty, topic])

  const resetPractice = useCallback(() => {
    setResult(null)
    setError(null)
    setPhase('idle')
  }, [])

  const cancelRecording = useCallback(() => {
    recBlobRef.current = null
    recChunksRef.current = []
    pendingQuestionRef.current = null
    setPhase('idle')
  }, [])

  const startRecording = useCallback(async () => {
    const text = editableText.trim()
    if (!text) return

    const isReadAloud = questionType === 'read_aloud'
    pendingQuestionRef.current = isReadAloud
      ? { prompt: llmPromptRef.current || 'Read the following text aloud:', reference_text: text }
      : { prompt: text, reference_text: null }

    recChunksRef.current = []
    recBlobRef.current = null
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recStreamRef.current = stream

      const audioCtx = new AudioContext()
      const src = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      analyserRef.current = { analyser, audioCtx }
      drawLive()

      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data) }
      mr.onstop = () => {
        recBlobRef.current = new Blob(recChunksRef.current, { type: 'audio/webm' })
        cancelAnimationFrame(animFrameRef.current)
        analyserRef.current?.audioCtx.close()
        analyserRef.current = null
        recStreamRef.current?.getTracks().forEach(t => t.stop())
        recStreamRef.current = null
        setPhase('recorded')
      }
      mr.start()
      setPhase('recording')

      if (timerEnabled && timerSecs > 0) {
        setCountdown(timerSecs)
        let remaining = timerSecs
        timerRef.current = setInterval(() => {
          remaining -= 1
          setCountdown(remaining)
          if (remaining <= 0) {
            clearInterval(timerRef.current)
            mr.stop()
          }
        }, 1000)
      }

      stopRecordingRef.current = () => {
        clearInterval(timerRef.current)
        if (mr.state !== 'inactive') mr.stop()
      }
    } catch (e) {
      setError('Microphone access denied')
      setPhase('idle')
    }
  }, [editableText, questionType, timerEnabled, timerSecs, drawLive])

  const stopRecording = useCallback(() => {
    stopRecordingRef.current?.()
  }, [])

  const submitRecording = useCallback(async () => {
    const q = pendingQuestionRef.current
    if (!recBlobRef.current || !q) return
    setPhase('submitting')
    try {
      const res = await oralApi.submitAttempt({
        questionType,
        questionLanguage: language,
        questionPrompt: q.prompt,
        questionDifficulty: difficulty,
        questionReference: q.reference_text,
        timerSecs: timerEnabled ? timerSecs : null,
        blob: recBlobRef.current,
      })
      setResult(res.data)
      setPhase('scored')
    } catch (e) {
      setError(e?.response?.data?.detail || 'Scoring failed')
      setPhase('idle')
    }
  }, [questionType, language, difficulty, timerEnabled, timerSecs])

  return {
    phase,
    editableText,
    setEditableText,
    result,
    error,
    timerEnabled,
    setTimerEnabled,
    timerSecs,
    setTimerSecs,
    countdown,
    liveCanvasRef,
    generateQuestion,
    resetPractice,
    startRecording,
    stopRecording,
    submitRecording,
    cancelRecording,
  }
}
