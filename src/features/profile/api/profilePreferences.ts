export const profilePreferences = {
  getNotificationPreferences(userId: string) {
    const data = localStorage.getItem(`notif_prefs_${userId}`)
    if (data) return JSON.parse(data)
    return { email: true, push: true, assignment: true, grade: true, announcement: true }
  },
  updateNotificationPreferences(userId: string, prefs: any) {
    localStorage.setItem(`notif_prefs_${userId}`, JSON.stringify(prefs))
  },
  getLocalePreferences(userId: string) {
    const data = localStorage.getItem(`locale_prefs_${userId}`)
    if (data) return JSON.parse(data)
    return { language: 'id', timezone: 'Asia/Jakarta' }
  },
  updateLocalePreferences(userId: string, prefs: any) {
    localStorage.setItem(`locale_prefs_${userId}`, JSON.stringify(prefs))
  }
}
