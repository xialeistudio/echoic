import { useEffect, useState } from 'react'
import { Star, CheckCircle2, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { audioApi } from '@/api'

function formatTime(s) {
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${String(ss).padStart(2, '0')}`
}

export default function SentenceList({ audioFileId, onSelect, onTitleLoad, selectedIndex }) {
  const { t } = useTranslation()
  const [audioFile, setAudioFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)
  const [hideMastered, setHideMastered] = useState(false)
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    if (!audioFileId) return
    setLoading(true)
    setOnlyBookmarked(false)
    setHideMastered(false)
    setSearchText('')
    audioApi.get(audioFileId)
      .then(r => { setAudioFile(r.data); onTitleLoad?.(r.data.title, r.data.sentences ?? []) })
      .finally(() => setLoading(false))
  }, [audioFileId])

  const sentences = audioFile?.sentences ?? []
  const bookmarkedCount = sentences.filter(s => s.bookmarked).length
  const masteredCount = sentences.filter(s => s.mastered).length

  const query = searchText.trim().toLowerCase()
  let visible = sentences
  if (query) visible = visible.filter(s => s.text.toLowerCase().includes(query))
  if (onlyBookmarked) visible = visible.filter(s => s.bookmarked)
  if (hideMastered) visible = visible.filter(s => !s.mastered)

  async function toggleBookmark(e, sentence) {
    e.stopPropagation()
    const { data } = await audioApi.toggleBookmark(audioFileId, sentence.index)
    setAudioFile(prev => {
      const sents = [...(prev.sentences || [])]
      sents[sentence.index] = { ...sents[sentence.index], bookmarked: data.bookmarked }
      return { ...prev, sentences: sents }
    })
  }

  async function toggleMastered(e, sentence) {
    e.stopPropagation()
    const { data } = await audioApi.toggleMastered(audioFileId, sentence.index)
    setAudioFile(prev => {
      const sents = [...(prev.sentences || [])]
      sents[sentence.index] = { ...sents[sentence.index], mastered: data.mastered }
      return { ...prev, sentences: sents }
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/20 bg-background shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder={t('practice.searchSentences')}
            className="w-full rounded-md bg-muted/40 py-1 pl-5 pr-5 text-[11px] outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-border"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        {/* Hide mastered toggle */}
        <button
          type="button"
          onClick={() => setHideMastered(v => !v)}
          title={t('practice.hideMastered')}
          className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
            hideMastered
              ? 'border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
              : 'border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600'
          }`}
        >
          <CheckCircle2 className="size-3" />
          {masteredCount > 0 && <span>{masteredCount}</span>}
        </button>
        {/* Bookmarked filter */}
        <button
          type="button"
          onClick={() => setOnlyBookmarked(v => !v)}
          title={t('practice.onlyBookmarked')}
          className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
            onlyBookmarked
              ? 'border-amber-400 text-amber-500 bg-amber-50 dark:bg-amber-950/30'
              : 'border-border text-muted-foreground hover:border-amber-400 hover:text-amber-500'
          }`}
        >
          <Star className="size-3" fill={onlyBookmarked ? 'currentColor' : 'none'} />
          {bookmarkedCount > 0 && <span>{bookmarkedCount}</span>}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-border/10">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-background px-3 py-3 border-b border-border/20 animate-pulse">
                <div className="h-3 bg-muted rounded w-full mb-1.5" />
                <div className="h-2.5 bg-muted rounded w-24" />
              </div>
            ))
          : visible.length === 0
            ? (
              <div className="flex flex-1 items-center justify-center py-12">
                <p className="text-xs text-muted-foreground">
                  {onlyBookmarked ? t('practice.noBookmarked') : t('practice.noSentences')}
                </p>
              </div>
            )
            : visible.map((sentence) => {
                const active = sentence.index === selectedIndex
                const bookmarked = sentence.bookmarked
                const mastered = sentence.mastered
                const count = sentence.practice_count ?? 0
                return (
                  <div
                    key={sentence.index}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(sentence)}
                    onKeyDown={e => e.key === 'Enter' && onSelect(sentence)}
                    className={[
                      'group flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-border/20 cursor-pointer',
                      active
                        ? 'bg-accent border-l-2 border-l-primary'
                        : mastered
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-l-2 border-l-emerald-400/50 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/20'
                          : 'bg-background border-l-2 border-l-transparent hover:bg-muted/30',
                    ].join(' ')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={['text-[11px] tabular-nums', active ? 'text-primary font-medium' : 'text-muted-foreground/60'].join(' ')}>
                          #{sentence.index + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {/* Mastered toggle */}
                          <button
                            type="button"
                            onClick={e => toggleMastered(e, sentence)}
                            className={`transition-colors ${mastered ? 'text-emerald-500' : 'text-transparent group-hover:text-muted-foreground/30'}`}
                          >
                            <CheckCircle2 className="size-3" />
                          </button>
                          {/* Bookmark toggle */}
                          <button
                            type="button"
                            onClick={e => toggleBookmark(e, sentence)}
                            className={`transition-colors ${bookmarked ? 'text-amber-400' : 'text-transparent group-hover:text-muted-foreground/30'}`}
                          >
                            <Star className="size-3" fill={bookmarked ? 'currentColor' : 'none'} />
                          </button>
                          {/* Practice count */}
                          {count > 0 && (
                            <span className="text-[10px] tabular-nums text-muted-foreground/50 bg-muted/60 rounded px-1">
                              {count}×
                            </span>
                          )}
                          <span className="text-[11px] tabular-nums text-muted-foreground/50">
                            {formatTime(sentence.start)}
                          </span>
                        </div>
                      </div>
                      <p className={[
                        'mt-0.5 line-clamp-3 text-[13px] leading-5',
                        active ? 'font-medium text-foreground' : mastered ? 'text-foreground/50' : 'text-foreground/80',
                      ].join(' ')}>
                        {sentence.text}
                      </p>
                    </div>
                  </div>
                )
              })
        }
      </div>
    </div>
  )
}
