import { useState, useRef, useEffect } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Mic, Square, Play, RotateCcw, Loader2 } from 'lucide-react'
import { practiceApi } from '@/api'
import { Button } from '@/components/ui/button'

export default function Recorder({ sentence, audioFileId, onResult }) {
  const [phase, setPhase] = useState('idle') // idle | recording | recorded | submitting
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const blobRef = useRef(null)
  const streamRef = useRef(null)
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)

  useEffect(() => {
    if (phase !== 'recorded' || !blobRef.current || !waveformRef.current) return
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#94a3b8',
      progressColor: '#3b82f6',
      cursorColor: 'transparent',
      height: 40,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    })
    ws.loadBlob(blobRef.current)
    wavesurferRef.current = ws
    return () => { ws.destroy(); wavesurferRef.current = null }
  }, [phase])

  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), [])

  useEffect(() => { reset() }, [sentence?.index])

  function reset() {
    blobRef.current = null
    chunksRef.current = []
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setError(null)
    setPhase('idle')
  }

  async function startRecording() {
    setError(null)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1 },
    })
    streamRef.current = stream
    const mr = new MediaRecorder(stream)
    mediaRecorderRef.current = mr
    chunksRef.current = []
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      blobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' })
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setPhase('recorded')
    }
    mr.start()
    setPhase('recording')
  }

  function stopRecording() { mediaRecorderRef.current?.stop() }

  async function submitRecording() {
    setPhase('submitting')
    setError(null)
    try {
      const { data } = await practiceApi.submitRecording(audioFileId, sentence.index, blobRef.current)
      onResult(data)
      reset()
    } catch (err) {
      setError(err.response?.data?.detail ?? err.message ?? '提交失败')
      setPhase('recorded')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 pb-8 shrink-0">
      {/* Waveform after recording */}
      {(phase === 'recorded' || phase === 'submitting') && (
        <div className="w-full max-w-lg px-8">
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <div ref={waveformRef} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {phase === 'idle' && (
        <>
          <button
            onClick={startRecording}
            className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 transition-colors flex items-center justify-center shadow-lg"
          >
            <Mic className="w-6 h-6 text-primary-foreground" />
          </button>
          <p className="text-xs text-muted-foreground">点击开始录音</p>
        </>
      )}

      {phase === 'recording' && (
        <>
          <button
            onClick={stopRecording}
            className="w-14 h-14 rounded-full bg-destructive hover:bg-destructive/90 transition-colors flex items-center justify-center shadow-lg animate-pulse"
          >
            <Square className="w-5 h-5 text-white" />
          </button>
          <p className="text-xs text-destructive">录音中，点击停止</p>
        </>
      )}

      {(phase === 'recorded' || phase === 'submitting') && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => wavesurferRef.current?.playPause()}
            disabled={phase === 'submitting'}
          >
            <Play className="w-4 h-4 mr-1" />
            播放
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={phase === 'submitting'}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            重录
          </Button>
          <Button
            size="sm"
            onClick={submitRecording}
            disabled={phase === 'submitting'}
          >
            {phase === 'submitting' && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            提交评分
          </Button>
        </div>
      )}
    </div>
  )
}
