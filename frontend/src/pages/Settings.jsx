import { useTranslation } from 'react-i18next'
import { Monitor, Moon, Sun } from 'lucide-react'
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

      {/* About */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('settings.about')}</h2>
        <div className="rounded-lg border border-border/60 px-4 divide-y divide-border/40">
          <div className="flex justify-between py-3 text-sm">
            <span className="text-muted-foreground">{t('settings.version')}</span>
            <span className="font-mono text-xs">{__APP_VERSION__}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
