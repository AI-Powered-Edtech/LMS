import { HubView } from "@/src/components/HubView";
import { navigationItems } from "@/src/config/navigation";
import { useAuth } from "@/src/contexts/AuthContext";

export function TeachingHub() {
  const { role } = useAuth();
  
  const items = navigationItems.filter(item => 
    item.location === 'teaching-hub' && item.roles.includes(role) && item.id !== 'analytics'
  );

  return (
    <HubView 
      title="Ruang Mengajar" 
      description="Kelola kelas, nilai, dan absensi siswa."
      items={items}
    />
  );
}

export function SocialHub() {
  const { role } = useAuth();
  
  const items = navigationItems.filter(item => 
    item.location === 'social-hub' && item.roles.includes(role)
  );

  return (
    <HubView 
      title="Sosial & Informasi" 
      description="Forum diskusi, jadwal, dan pengumuman sekolah."
      items={items}
    />
  );
}

export function GamificationHub() {
  const { role } = useAuth();
  
  const items = navigationItems.filter(item => 
    item.location === 'gamification-hub' && item.roles.includes(role)
  );

  return (
    <HubView 
      title="Prestasi & Permainan" 
      description="Lihat pencapaian, sertifikat, dan mainkan kuis."
      items={items}
    />
  );
}

export function AdminHub() {
  const { role } = useAuth();
  
  const items = navigationItems.filter(item => 
    item.location === 'admin-hub' && item.roles.includes(role)
  );

  return (
    <HubView 
      title="Administrasi Sekolah" 
      description="Kelola keuangan, PPDB, dan dokumen administrasi."
      items={items}
    />
  );
}
