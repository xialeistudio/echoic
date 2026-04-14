import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'
import en from './locales/en.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'

const SUPPORTED_LANGS = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko']

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem('echonic-settings'))?.appLang
  } catch {
    return null
  }
})()

const detectBrowserLang = () => {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const lang of langs) {
    if (SUPPORTED_LANGS.includes(lang)) return lang
    const prefix = lang.split('-')[0]
    const match = SUPPORTED_LANGS.find(s => s.split('-')[0] === prefix)
    if (match) return match
  }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'zh-TW': { translation: zhTW },
    en: { translation: en },
    ja: { translation: ja },
    ko: { translation: ko },
  },
  lng: saved || detectBrowserLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
