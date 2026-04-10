import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { audioApi } from '@/api'

function formatTime(s) {
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${String(ss).padStart(2, '0')}`
}

export default function SentenceList({ audioFileId, onSelect, onTitleLoad, selectedIndex }) {
  const [audioFile, setAudioFile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!audioFileId) return
    setLoading(true)
    audioApi.get(audioFileId)
      .then(r => { setAudioFile(r.data); onTitleLoad?.(r.data.title, r.data.sentences ?? []) })
      .finally(() => setLoading(false))
  }, [audioFileId])

  const sentences = audioFile?.sentences ?? []

  async function toggleBookmark(e, sentence) {
    e.stopPropagation()
    const { data } = await audioApi.toggleBookmark(audioFileId, sentence.index)
    setAudioFile(prev => {
      const sents = [...(prev.sentences || [])]
      sents[sentence.index] = { ...sents[sentence.index], bookmarked: data.bookmarked }
      return { ...prev, sentences: sents }
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-border/10">
      {loading
        ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-background px-3 py-3 border-b border-border/20 animate-pulse">
              <div className="h-3 bg-muted rounded w-full mb-1.5" />
              <div className="h-2.5 bg-muted rounded w-24" />
            </div>
          ))
        : sentences.map((sentence, idx) => {
            const active = sentence.index === selectedIndex
            const bookmarked = sentence.bookmarked
            return (
              <div
                key={sentence.index}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(sentence)}
                onKeyDown={e => e.key === 'Enter' && onSelect(sentence)}
                className={[
                  'group flex w-full gap-2.5 bg-background px-3 py-2.5 text-left transition-colors border-b border-border/20 cursor-pointer',
                  active
                    ? 'bg-primary/[0.07] border-l-2 border-l-primary'
                    : 'border-l-2 border-l-transparent hover:bg-muted/30',
                ].join(' ')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={['text-[11px] tabular-nums', active ? 'text-primary font-medium' : 'text-muted-foreground/60'].join(' ')}>
                      #{idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={e => toggleBookmark(e, sentence)}
                        className={`transition-colors ${bookmarked ? 'text-amber-400' : 'text-transparent group-hover:text-muted-foreground/30'}`}
                      >
                        <Star className="size-3" fill={bookmarked ? 'currentColor' : 'none'} />
                      </button>
                      <span className="text-[11px] tabular-nums text-muted-foreground/50">
                        {formatTime(sentence.start)}
                      </span>
                    </div>
                  </div>
                  <p className={['mt-0.5 line-clamp-3 text-[13px] leading-5', active ? 'font-medium text-foreground' : 'text-foreground/80'].join(' ')}>
                    {sentence.text}
                  </p>
                </div>
              </div>
            )
          })
      }
    </div>
  )
}
