import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { galleryApi, collectionApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'

const LEVEL_ORDER = ['beginner', 'elementary', 'intermediate', 'upper-intermediate']

function levelKey(level) {
  const map = {
    beginner: 'gallery.beginner',
    elementary: 'gallery.elementary',
    intermediate: 'gallery.intermediate',
    'upper-intermediate': 'gallery.upperIntermediate',
  }
  return map[level] ?? level
}

function PillBar({ items, active, onSelect, allLabel }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
          active === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
        }`}
      >
        {allLabel}
      </button>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            active === item.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

const STEP_LABELS_KEY = {
  downloading: 'upload.stepDownloading',
  saving: 'upload.stepSaving',
  compressing: 'upload.stepCompressing',
  transcribing: 'upload.stepTranscribing',
}

function ImportDialog({ episode, collections, open, onOpenChange, onSuccess }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // idle | importing | done | error
  const [status, setStatus] = useState('idle')
  const [step, setStep] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [collectionId, setCollectionId] = useState(null)

  // Reset state whenever dialog opens
  function handleOpenChange(val) {
    if (val) {
      setStatus('idle')
      setStep(null)
      setErrorMsg(null)
      setCollectionId(null)
    }
    onOpenChange(val)
  }

  async function handleImport() {
    setStatus('importing')
    setStep(t('upload.stepDownloading'))
    setErrorMsg(null)

    try {
      const resp = await fetch('/api/audio/from-url?compress=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: episode.audio_url,
          title: episode.title,
          collection_id: collectionId || null,
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.detail || t('upload.failedGeneric'))
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.step === 'error') throw new Error(data.message)
          if (data.step === 'done') {
            setStatus('done')
            onSuccess?.()
            setTimeout(() => navigate(`/speaking/${data.result.id}`), 600)
            return
          }
          const labelKey = STEP_LABELS_KEY[data.step]
          setStep(labelKey ? t(labelKey) : data.step)
        }
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || t('upload.failedGeneric'))
    }
  }

  const busy = status === 'importing' || status === 'done'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{t('gallery.import')}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-foreground font-medium line-clamp-2 leading-snug">
          {episode.title}
        </p>

        {collections.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label>{t('library.collection')}</Label>
            <Select
              value={collectionId ? String(collectionId) : '0'}
              onValueChange={v => setCollectionId(v === '0' ? null : Number(v))}
              disabled={busy}
            >
              <SelectTrigger>
                <span className="truncate">
                  {collectionId
                    ? (collections.find(c => c.id === collectionId)?.name ?? t('library.defaultCollection'))
                    : t('library.defaultCollection')}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('library.defaultCollection')}</SelectItem>
                {collections.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {status === 'importing' && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin shrink-0" />
            {step || t('gallery.importing')}
          </p>
        )}

        {status === 'done' && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-3 shrink-0 text-green-500" />
            {t('gallery.done')}
          </p>
        )}

        {status === 'error' && errorMsg && (
          <p className="text-xs text-destructive flex items-start gap-1.5">
            <AlertCircle className="size-3 mt-0.5 shrink-0" />
            {errorMsg}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={busy} />}>
            {t('library.cancel')}
          </DialogClose>
          <Button onClick={handleImport} disabled={busy}>
            {status === 'importing' ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" />
                {t('gallery.importing')}
              </span>
            ) : t('gallery.import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EpisodeCard({ episode, collections }) {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [imported, setImported] = useState(false)

  const pubDate = (() => {
    try {
      return new Date(episode.pub_date).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    } catch {
      return episode.pub_date
    }
  })()

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        {/* Source · Program */}
        <div className="text-xs text-muted-foreground">
          {episode.source_label} · {episode.program}
        </div>

        {/* Title */}
        <div className="text-sm font-semibold text-foreground leading-snug line-clamp-2 flex-1">
          {episode.title}
        </div>

        {/* Description */}
        <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {episode.description}
        </div>

        {/* Meta row + action */}
        <div className="flex items-center gap-2 flex-wrap">
          {episode.duration && (
            <span className="text-xs text-muted-foreground">{episode.duration}</span>
          )}
          {episode.duration && <span className="text-xs text-muted-foreground">·</span>}
          <span className="text-xs text-muted-foreground">{pubDate}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {t(levelKey(episode.level))}
          </Badge>
          <button
            className="ml-auto text-xs px-2 py-0.5 rounded-full border transition-colors disabled:opacity-40
              border-border text-muted-foreground hover:border-primary hover:text-primary
              disabled:hover:border-border disabled:hover:text-muted-foreground"
            onClick={() => setDialogOpen(true)}
            disabled={imported}
          >
            {imported ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="size-3 text-green-500" />
                {t('gallery.done')}
              </span>
            ) : t('gallery.import')}
          </button>
        </div>
      </div>

      <ImportDialog
        episode={episode}
        collections={collections}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => setImported(true)}
      />
    </>
  )
}

export default function Gallery() {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [collections, setCollections] = useState([])

  const [activeSource, setActiveSource] = useState(null)
  const [activeLevel, setActiveLevel] = useState(null)
  const [activeProgram, setActiveProgram] = useState(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 24

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    galleryApi.list()
      .then(r => setData(r.data))
      .catch(() => setError(t('gallery.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
    collectionApi.list().then(r => setCollections(r.data)).catch(() => {})
  }, [load])

  // Reset program filter + page when source or level changes
  function handleSourceChange(val) {
    setActiveSource(val)
    setActiveProgram(null)
    setPage(1)
  }
  function handleLevelChange(val) {
    setActiveLevel(val)
    setActiveProgram(null)
    setPage(1)
  }
  function handleProgramChange(val) {
    setActiveProgram(val)
    setPage(1)
  }

  const sources = data?.sources ?? []
  const allPrograms = data?.programs ?? []
  const allEpisodes = data?.episodes ?? []

  // Levels derived from data
  const levels = LEVEL_ORDER.filter(l =>
    allEpisodes.some(e =>
      e.level === l &&
      (activeSource === null || e.source === activeSource)
    )
  )

  // Programs filtered by active source & level
  const filteredPrograms = allPrograms.filter(p => {
    if (activeSource && p.source !== activeSource) return false
    if (activeLevel && p.level !== activeLevel) return false
    return true
  })

  // Episodes filtered by all three pills
  const filteredEpisodes = allEpisodes.filter(e => {
    if (activeSource && e.source !== activeSource) return false
    if (activeLevel && e.level !== activeLevel) return false
    if (activeProgram && e.program_id !== activeProgram) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filteredEpisodes.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const episodes = filteredEpisodes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold">{t('gallery.title')}</h1>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>Retry</Button>
        </div>
      )}

      {!loading && !error && data && (
        <div className="flex-1 overflow-auto">
          <div className="px-6 py-4 flex flex-col gap-3 border-b border-border">
            {/* Source pills */}
            <PillBar
              items={sources.map(s => ({ id: s.id, label: s.label }))}
              active={activeSource}
              onSelect={handleSourceChange}
              allLabel={t('gallery.allSources')}
            />

            {/* Level pills */}
            <PillBar
              items={levels.map(l => ({ id: l, label: t(levelKey(l)) }))}
              active={activeLevel}
              onSelect={handleLevelChange}
              allLabel={t('gallery.allLevels')}
            />

            {/* Program pills — linked to source/level */}
            <PillBar
              items={filteredPrograms.map(p => ({ id: p.id, label: p.name }))}
              active={activeProgram}
              onSelect={handleProgramChange}
              allLabel={t('gallery.allPrograms')}
            />
          </div>

          <div className="px-6 py-4 flex flex-col gap-6">
            {filteredEpisodes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('gallery.noEpisodes')}</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {episodes.map((ep, idx) => (
                    <EpisodeCard
                      key={`${ep.source}-${ep.program_id}-${(safePage - 1) * PAGE_SIZE + idx}`}
                      episode={ep}
                      collections={collections}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
