export interface NotificationPreferences {
  email: boolean
  push: boolean
  assignment: boolean
  grade: boolean
  announcement: boolean
}

export interface LocalePreferences {
  language: string
  timezone: string
  // FIXED: Added dateFormat to persist date format preference
  dateFormat?: string
}

export const profilePreferences = {
  getNotificationPreferences(userId: string): NotificationPreferences {
    const data = localStorage.getItem(`notif_prefs_${userId}`)
    if (data) return JSON.parse(data) as NotificationPreferences
    return { email: true, push: true, assignment: true, grade: true, announcement: true }
  },
  updateNotificationPreferences(userId: string, prefs: NotificationPreferences) {
    localStorage.setItem(`notif_prefs_${userId}`, JSON.stringify(prefs))
  },
  getLocalePreferences(userId: string): LocalePreferences {
    const data = localStorage.getItem(`locale_prefs_${userId}`)
    if (data) return JSON.parse(data) as LocalePreferences
    return { language: 'id', timezone: 'Asia/Jakarta' }
  },
  updateLocalePreferences(userId: string, prefs: LocalePreferences) {
    localStorage.setItem(`locale_prefs_${userId}`, JSON.stringify(prefs))
  },
}
