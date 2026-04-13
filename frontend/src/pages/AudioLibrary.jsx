import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, LayoutGrid, List, Pencil, Trash2, RotateCcw, FolderOpen, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { audioApi, collectionApi } from '@/api'
import AudioUpload from '../components/AudioUpload'

const LANGUAGES = [
  { value: 'en-US', label: '英语 (en-US)' },
  { value: 'zh-CN', label: '中文简体 (zh-CN)' },
  { value: 'zh-TW', label: '中文繁体 (zh-TW)' },
  { value: 'ja-JP', label: '日语 (ja-JP)' },
  { value: 'ko-KR', label: '韩语 (ko-KR)' },
  { value: 'fr-FR', label: '法语 (fr-FR)' },
  { value: 'de-DE', label: '德语 (de-DE)' },
  { value: 'es-ES', label: '西班牙语 (es-ES)' },
]

const LANG_NORMALIZE = { en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' }
function normLang(code) {
  return LANG_NORMALIZE[code] ?? code
}

function formatDuration(secs) {
  if (secs == null) return '—'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function timeAgo(dateStr, t) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('time.justNow')
  if (mins < 60) return t('time.minutesAgo', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('time.hoursAgo', { count: hours })
  return t('time.daysAgo', { count: Math.floor(hours / 24) })
}

export default function AudioLibrary() {
  const { t } = useTranslation()
  const [files, setFiles] = useState([])
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [view, setView] = useState('list')
  const [showUpload, setShowUpload] = useState(false)

  // Collections
  const [collections, setCollections] = useState([])
  const [activeCollection, setActiveCollection] = useState(null) // null = all
  const [newColName, setNewColName] = useState('')
  const [showNewCol, setShowNewCol] = useState(false)
  const [editCol, setEditCol] = useState(null)
  const [editColName, setEditColName] = useState('')
  const [deleteCol, setDeleteCol] = useState(null)

  // Edit dialog
  const [editFile, setEditFile] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editLang, setEditLang] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Delete dialog
  const [deleteFile, setDeleteFile] = useState(null)

  const navigate = useNavigate()

  function loadCollections() {
    collectionApi.list().then(r => setCollections(r.data)).catch(() => {})
  }

  function load() {
    audioApi.list().then(r => setFiles(r.data)).catch(() => {})
  }

  useEffect(() => { load(); loadCollections() }, [])

  async function createCollection() {
    if (!newColName.trim()) return
    await collectionApi.create(newColName.trim()).catch(() => {})
    setNewColName('')
    setShowNewCol(false)
    loadCollections()
  }

  async function commitRenameCol() {
    if (!editColName.trim()) return
    await collectionApi.rename(editCol.id, editColName.trim()).catch(() => {})
    setEditCol(null)
    loadCollections()
  }

  async function confirmDeleteCol() {
    await collectionApi.delete(deleteCol.id).catch(() => {})
    if (activeCollection === deleteCol.id) setActiveCollection(null)
    setDeleteCol(null)
    loadCollections()
    load()
  }

  function handleUploaded() {
    setShowUpload(false)
    load()
  }

  function openEdit(e, f) {
    e.stopPropagation()
    setEditFile(f)
    setEditTitle(f.title)
    setEditLang(normLang(f.language))
  }

  async function commitEdit() {
    if (!editTitle.trim()) return
    setEditSaving(true)
    await audioApi.rename(editFile.id, editTitle.trim(), editLang).catch(() => {})
    setEditSaving(false)
    setEditFile(null)
    load()
  }

  async function confirmDelete() {
    await audioApi.delete(deleteFile.id).catch(() => {})
    setDeleteFile(null)
    load()
  }

  function applySearch() {
    setAppliedSearch(search)
  }

  function resetSearch() {
    setSearch('')
    setAppliedSearch('')
  }

  const filtered = files
    .filter(f => f.title.toLowerCase().includes(appliedSearch.toLowerCase()))
    .filter(f => activeCollection === null ? true : f.collection_id === activeCollection)

  return (
    <div className="flex h-full">
      {/* Collection sidebar */}
      <div className="hidden md:flex flex-col w-44 shrink-0 border-r h-full overflow-y-auto">
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('library.collections')}</span>
          <button onClick={() => setShowNewCol(v => !v)} className="text-muted-foreground hover:text-foreground">
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
        {showNewCol && (
          <div className="px-2 pb-2 flex gap-1">
            <Input
              autoFocus
              className="h-7 text-xs"
              placeholder={t('library.newCollection')}
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createCollection(); if (e.key === 'Escape') setShowNewCol(false) }}
            />
          </div>
        )}
        <button
          onClick={() => setActiveCollection(null)}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm text-left w-full transition-colors ${activeCollection === null ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted/50 text-muted-foreground'}`}
        >
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t('library.allAudio')}</span>
        </button>
        {collections.map(col => (
          <div key={col.id} className={`group flex items-center gap-1 px-3 py-1.5 text-sm transition-colors cursor-pointer ${activeCollection === col.id ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted/50 text-muted-foreground'}`}
            onClick={() => setActiveCollection(col.id)}>
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate flex-1">{col.name}</span>
            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setEditCol(col); setEditColName(col.name) }} className="p-0.5 rounded hover:bg-background/50">
                <Pencil className="w-3 h-3" />
              </button>
              <button onClick={() => setDeleteCol(col)} className="p-0.5 rounded hover:bg-background/50 text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-3 border-b">
        {/* View toggle - desktop only */}
        <div className="hidden md:flex items-center rounded-md border overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`px-2 py-1.5 transition-colors ${view === 'grid' ? 'bg-muted' : 'hover:bg-muted/50'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-2 py-1.5 transition-colors ${view === 'list' ? 'bg-muted' : 'hover:bg-muted/50'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 md:flex-none">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={t('library.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applySearch()}
            className="pl-8 h-8 text-sm w-full md:w-[160px]"
          />
        </div>

        <Button variant="default" size="sm" className="h-8 px-3 text-sm" onClick={applySearch}>
          <Search className="w-3.5 h-3.5 md:mr-1" />
          <span className="hidden md:inline">{t('library.search')}</span>
        </Button>

        {appliedSearch && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-sm"
            onClick={resetSearch}
          >
            <RotateCcw className="w-3.5 h-3.5 md:mr-1" />
            <span className="hidden md:inline">{t('library.reset')}</span>
          </Button>
        )}

        <div className="hidden md:block flex-1" />

        <Button size="sm" className="h-8 md:h-9 md:px-4" onClick={() => setShowUpload(v => !v)}>
          <Plus className="w-4 h-4 md:mr-1.5" />
          <span className="hidden md:inline">{t('library.addResource')}</span>
        </Button>
      </div>

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('library.addAudio')}</DialogTitle>
          </DialogHeader>
          <AudioUpload onSuccess={handleUploaded} collections={collections} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editFile} onOpenChange={open => { if (!open) setEditFile(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('library.editResource')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('library.title')}</Label>
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && commitEdit()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('library.language')}</Label>
              <Select value={editLang} onValueChange={setEditLang}>
                <SelectTrigger>
                  <SelectValue placeholder={t('library.selectLanguage')} />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(l => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFile(null)}>{t('library.cancel')}</Button>
            <Button disabled={!editTitle.trim() || editSaving} onClick={commitEdit}>{t('library.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteFile} onOpenChange={open => { if (!open) setDeleteFile(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('library.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('library.deleteConfirmMsg', { title: deleteFile?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('library.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              {t('library.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Collection rename dialog */}
      <Dialog open={!!editCol} onOpenChange={open => { if (!open) setEditCol(null) }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>{t('library.renameCollection')}</DialogTitle></DialogHeader>
          <Input autoFocus value={editColName} onChange={e => setEditColName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitRenameCol()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCol(null)}>{t('library.cancel')}</Button>
            <Button onClick={commitRenameCol}>{t('library.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collection delete dialog */}
      <AlertDialog open={!!deleteCol} onOpenChange={open => { if (!open) setDeleteCol(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('library.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('library.deleteCollectionMsg', { name: deleteCol?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('library.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCol} className="bg-destructive text-white hover:bg-destructive/90">{t('library.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <p className="text-sm">
              {appliedSearch ? t('library.noMatch') : t('library.empty')}
            </p>
          </div>
        ) : view === 'list' ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('library.name')}</TableHead>
                    <TableHead className="w-[110px]">{t('library.language')}</TableHead>
                    <TableHead className="w-[70px]">{t('library.duration')}</TableHead>
                    <TableHead className="w-[90px]">{t('library.practiceCount')}</TableHead>
                    <TableHead className="w-[110px]">{t('library.updatedAt')}</TableHead>
                    <TableHead className="w-[80px]">{t('library.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(f => (
                    <TableRow key={f.id} className="cursor-pointer">
                      <TableCell
                        className="font-medium hover:underline"
                        onClick={() => navigate(`/speaking/${f.id}`)}
                      >
                        {f.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{normLang(f.language)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDuration(f.duration)}</TableCell>
                      <TableCell className="text-muted-foreground">{f.practice_count ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{timeAgo(f.created_at, t)}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => openEdit(e, f)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteFile(f) }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile card list */}
            <div className="md:hidden space-y-2">
              {filtered.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/speaking/${f.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {normLang(f.language)} · {formatDuration(f.duration)} · {f.practice_count ?? 0} {t('library.practiceCount')}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => openEdit(e, f)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteFile(f) }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
            {filtered.map(f => (
              <div
                key={f.id}
                onClick={() => navigate(`/speaking/${f.id}`)}
                className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <div className="w-full aspect-square rounded-md bg-muted flex items-center justify-center text-2xl text-muted-foreground font-medium select-none">
                  {f.title.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-medium truncate">{f.title}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(f.created_at, t)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
