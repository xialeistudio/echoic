import { useTranslation } from 'react-i18next'
import { Monitor, Moon, Sun, ExternalLink } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useSettings } from '@/lib/settings'

const THEMES = [
  { value: 'system', key: 'settings.themeSystem', icon: Monitor },
  { value: 'light', key: 'settings.themeLight', icon: Sun },
  { value: 'dark', key: 'settings.themeDark', icon: Moon },
]

const LANGS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
]

function langLabel(value) {
  return LANGS.find(l => l.value === value)?.label ?? value
}

function SettingRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function Settings() {
  const { t } = useTranslation()
  const { settings, update } = useSettings()

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-8">{t('settings.title')}</h1>

      {/* Appearance */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('settings.appearance')}</h2>
        <div className="rounded-lg border border-border/60 px-4">
          <SettingRow label={t('settings.theme')}>
            <div className="flex rounded-lg border border-border/60 overflow-hidden">
              {THEMES.map(({ value, key, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => update({ theme: value })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                    settings.theme === value
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="size-3.5" />
                  {t(key)}
                </button>
              ))}
            </div>
          </SettingRow>
        </div>
      </section>

      {/* Language */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('settings.language')}</h2>
        <div className="rounded-lg border border-border/60 px-4 divide-y divide-border/40">
          <SettingRow label={t('settings.appLang')} desc={t('settings.appLangDesc')}>
            <Select value={settings.appLang} onValueChange={v => update({ appLang: v })}>
              <SelectTrigger className="w-[130px] h-8 text-sm">
                <SelectValue>{langLabel(settings.appLang)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGS.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label={t('settings.nativeLang')} desc={t('settings.nativeLangDesc')}>
            <Select value={settings.nativeLang} onValueChange={v => update({ nativeLang: v })}>
              <SelectTrigger className="w-[130px] h-8 text-sm">
                <SelectValue>{langLabel(settings.nativeLang)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LANGS.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('settings.shortcuts')}</h2>
        <div className="rounded-lg border border-border/60 px-4 divide-y divide-border/40">
          {[
            { keys: ['Space'],         label: t('settings.shortcut.playPause') },
            { keys: ['R'],             label: t('settings.shortcut.record') },
            { keys: ['Enter'],         label: t('settings.shortcut.assess') },
            { keys: ['←', '→'],        label: t('settings.shortcut.navigate') },
            { keys: ['Esc'],           label: t('settings.shortcut.cancel') },
          ].map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span className="text-sm font-medium">{label}</span>
              <div className="flex items-center gap-1">
                {keys.map(k => (
                  <kbd key={k} className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground min-w-[1.5rem]">{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('settings.about')}</h2>
        <div className="rounded-lg border border-border/60 px-4 divide-y divide-border/40">
          <div className="flex justify-between items-center py-3 text-sm">
            <span className="font-medium">{t('settings.sourceCode')}</span>
            <a
              href="https://github.com/xialeistudio/echoic"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              GitHub <ExternalLink className="size-3" />
            </a>
          </div>
          <div className="py-3 text-xs text-muted-foreground leading-relaxed">
            {t('settings.contentNotice')}
          </div>
        </div>
      </section>
    </div>
  )
}
