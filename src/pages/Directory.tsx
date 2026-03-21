import { useAuth } from '@/src/contexts/AuthContext'
import { navigationItems } from '@/src/config/navigation'
import { HubView } from '@/src/components/HubView'

export function Directory() {
  const { role } = useAuth()

  // Filter pages based on the current user's role and location
  const filteredPages = navigationItems.filter((page) => {
    // Only show directory items
    if (page.location !== 'directory') return false

    // Check role
    return page.roles.includes(role)
  })

  return (
    <HubView
      title="Direktori Modul"
      description="Daftar seluruh halaman dan fitur tambahan yang tersedia untuk peran Anda."
      items={filteredPages}
    />
  )
}
