import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import id from './locales/id.json'

export const defaultNS = 'translation'

export const resources = {
  id: { translation: id },
  en: { translation: en },
} as const

export type Resources = typeof resources

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: 'id',
    fallbackLng: 'id',
    defaultNS,
    ns: [defaultNS],
    interpolation: { escapeValue: false },
    returnNull: false,
  })
}

export default i18n
