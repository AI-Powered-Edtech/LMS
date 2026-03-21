type Locale = 'id' | 'en'

let currentLocale: Locale = 'id'
let translations: Record<string, string> = {}

async function loadLocale(locale: Locale): Promise<void> {
  const mod = await import(`./locales/${locale}.json`)
  translations = mod.default
  currentLocale = locale
}

// Eagerly load Indonesian
loadLocale('id')

export function t(key: string, params?: Record<string, string>): string {
  let text = translations[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v)
    }
  }
  return text
}

export function setLocale(locale: Locale): Promise<void> {
  return loadLocale(locale)
}

export function getLocale(): Locale {
  return currentLocale
}

export type { Locale }
