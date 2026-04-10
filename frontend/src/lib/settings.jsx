import { createContext, useContext, useState, useEffect } from 'react'
import i18n from '@/i18n'

const DEFAULTS = {
  theme: 'system',        // system | dark | light
  appLang: 'zh-CN',       // zh-CN | zh-TW | en
  nativeLang: 'zh-CN',    // zh-CN | zh-TW | en
}

const KEY = 'echonic-settings'

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }
  } catch {
    return { ...DEFAULTS }
  }
}

function save(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  // Apply theme on mount and change
  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  // Sync i18n language
  useEffect(() => {
    if (i18n.language !== settings.appLang) i18n.changeLanguage(settings.appLang)
  }, [settings.appLang])

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings.theme])

  function update(patch) {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      save(next)
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
