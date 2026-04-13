import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Loader2, UploadCloud } from 'lucide-react'
import { audioApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

function extractError(err, fallback) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(d => d.msg).join('; ')
  return err.message ?? fallback
}

export default function AudioUpload({ onSuccess } = {}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [compress, setCompress] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const inputRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await audioApi.upload(file, { compress })
      onSuccess ? onSuccess(data) : navigate(`/speaking/${data.id}`)
    } catch (err) {
      setError(extractError(err, t('upload.failedGeneric')))
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await audioApi.importFromUrl(url, title || undefined, { compress })
      onSuccess ? onSuccess(data) : navigate(`/speaking/${data.id}`)
    } catch (err) {
      setError(extractError(err, t('upload.failedGeneric')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="upload">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="upload" className="flex-1">{t('upload.uploadFile')}</TabsTrigger>
          <TabsTrigger value="url" className="flex-1">{t('upload.importLink')}</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <div className="flex flex-col gap-4">
            <div
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40'}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <UploadCloud className="size-8 text-muted-foreground" />
              {file ? (
                <span className="text-sm font-medium text-foreground">{file.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t('upload.dragOrClick', { defaultValue: '拖拽文件或' })}<span className="text-foreground underline underline-offset-2">{t('upload.dragOrClick_click', { defaultValue: '点击选择' })}</span>
                </span>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0] ?? null)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={compress} onCheckedChange={setCompress} size="sm" />
                <Label className="text-sm text-muted-foreground cursor-pointer" onClick={() => setCompress(v => !v)}>
                  {t('upload.compress')}
                </Label>
              </div>
            </div>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : t('upload.upload')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="url">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="audio-url">{t('upload.audioUrl')}</Label>
              <Input
                id="audio-url"
                type="url"
                placeholder="https://youtube.com/watch?v=... or https://example.com/audio.mp3"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="audio-title">{t('upload.titleLabel')}<span className="text-muted-foreground">{t('upload.optional')}</span></Label>
              <Input
                id="audio-title"
                type="text"
                placeholder={t('upload.audioTitle') || 'Auto-detected from YouTube'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={compress} onCheckedChange={setCompress} size="sm" />
              <Label className="text-sm text-muted-foreground cursor-pointer" onClick={() => setCompress(v => !v)}>
                {t('upload.compress')}
              </Label>
            </div>
            <Button onClick={handleImport} disabled={!url || loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : t('upload.import')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
