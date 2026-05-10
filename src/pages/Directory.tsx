import { HubView } from "@/components/HubView";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { navigationItems } from "@/shared/config/navigation";

export function Directory() {
  usePageTitle("Direktori");
  const { role } = useAuth();

  // Filter pages based on the current user's role and location
  const filteredPages = navigationItems.filter((page) => {
    // Only show directory items
    if (page.location !== "directory") return false;

    // Check role
    return page.roles.includes(role);
  });

  return (
    <HubView
      title="Direktori Modul"
      description="Daftar seluruh halaman dan fitur tambahan yang tersedia untuk peran Anda."
      items={filteredPages}
    />
  );
}
