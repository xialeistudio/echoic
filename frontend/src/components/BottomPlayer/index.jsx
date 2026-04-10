import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${ss.toString().padStart(2, '0')}`
}

export default function BottomPlayer({ audioUrl, currentSentence }) {
  const containerRef = useRef(null)
  const wsRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#94a3b8',
      progressColor: '#3b82f6',
      cursorColor: '#3b82f6',
      height: 48,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
    })
    ws.load(audioUrl)
    ws.on('ready', () => { setReady(true); setDuration(ws.getDuration()) })
    ws.on('play', () => setPlaying(true))
    ws.on('pause', () => setPlaying(false))
    ws.on('finish', () => setPlaying(false))
    ws.on('timeupdate', (t) => setCurrentTime(t))
    wsRef.current = ws
    return () => {
      ws.destroy()
      wsRef.current = null
      setReady(false)
      setPlaying(false)
      setCurrentTime(0)
      setDuration(0)
    }
  }, [audioUrl])

  useEffect(() => {
    if (!wsRef.current || !ready || !currentSentence) return
    const dur = wsRef.current.getDuration()
    if (dur > 0) wsRef.current.seekTo(currentSentence.start / dur)
  }, [currentSentence?.index, ready])

  return (
    <div className="flex items-center gap-3 px-4 h-full border-t bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-8 w-8"
        disabled={!ready}
        onClick={() => wsRef.current?.playPause()}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>

      <span className="text-xs tabular-nums text-muted-foreground shrink-0 w-[80px]">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <div ref={containerRef} className="flex-1 min-w-0" />
    </div>
  )
}
