import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, UserSquare2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { dossierService, type StudentDossier as DossierType } from '@/features/dossier/api/dossierService'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'

export function StudentDossier() {
  usePageTitle('Dossier Siswa')
  const { profileId } = useParams<{ profileId: string }>()
  const { tenantId } = useAuth()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['student_dossier', profileId],
    queryFn: () => (profileId ? dossierService.get(profileId) : Promise.resolve(null)),
    enabled: !!profileId,
  })

  const [form, setForm] = useState<Partial<DossierType>>({})
  useEffect(() => {
    if (dossier) setForm(dossier)
  }, [dossier])

  const save = useMutation({
    mutationFn: () =>
      dossierService.upsert({
        ...form,
        profile_id: profileId!,
        tenant_id: tenantId!,
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Dossier disimpan' })
      void qc.invalidateQueries({ queryKey: ['student_dossier', profileId] })
    },
    onError: (err) =>
      addToast({
        type: 'error',
        message: 'Gagal menyimpan dossier',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      }),
  })

  function setField<K extends keyof DossierType>(key: K, value: DossierType[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  if (!profileId) {
    return (
      <div className="p-8 text-sm text-slate-500">Profile ID tidak ditemukan di URL.</div>
    )
  }

  if (isLoading) {
    return <div className="p-8 text-sm text-slate-500">Memuat...</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <UserSquare2 className="w-6 h-6 text-blue-500" />
          Dossier Siswa
        </h1>
        <Button
          variant="primary"
          icon={<Save className="w-4 h-4" />}
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Identitas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="NISN"
            value={form.nisn ?? ''}
            onChange={(e) => setField('nisn', e.target.value)}
            maxLength={10}
          />
          <Input
            label="NIK"
            value={form.nik ?? ''}
            onChange={(e) => setField('nik', e.target.value)}
            maxLength={16}
          />
          <Input
            label="NIS Lokal"
            value={form.nis_local ?? ''}
            onChange={(e) => setField('nis_local', e.target.value)}
          />
          <Input
            label="Tempat Lahir"
            value={form.place_of_birth ?? ''}
            onChange={(e) => setField('place_of_birth', e.target.value)}
          />
          <Input
            type="date"
            label="Tanggal Lahir"
            value={form.date_of_birth ?? ''}
            onChange={(e) => setField('date_of_birth', e.target.value)}
          />
          <select
            value={form.gender ?? ''}
            onChange={(e) => setField('gender', (e.target.value || null) as 'L' | 'P' | null)}
          >
            <option value="">—</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
          <Input
            label="Agama"
            value={form.religion ?? ''}
            onChange={(e) => setField('religion', e.target.value)}
          />
          <Input
            label="Kewarganegaraan"
            value={form.nationality ?? 'WNI'}
            onChange={(e) => setField('nationality', e.target.value)}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Alamat
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Jalan / Alamat"
            value={form.address_street ?? ''}
            onChange={(e) => setField('address_street', e.target.value)}
            className="md:col-span-2"
          />
          <Input
            label="RT"
            value={form.address_rt ?? ''}
            onChange={(e) => setField('address_rt', e.target.value)}
          />
          <Input
            label="RW"
            value={form.address_rw ?? ''}
            onChange={(e) => setField('address_rw', e.target.value)}
          />
          <Input
            label="Kelurahan"
            value={form.address_kelurahan ?? ''}
            onChange={(e) => setField('address_kelurahan', e.target.value)}
          />
          <Input
            label="Kecamatan"
            value={form.address_kecamatan ?? ''}
            onChange={(e) => setField('address_kecamatan', e.target.value)}
          />
          <Input
            label="Kota / Kabupaten"
            value={form.address_kota_kab ?? ''}
            onChange={(e) => setField('address_kota_kab', e.target.value)}
          />
          <Input
            label="Provinsi"
            value={form.address_province ?? ''}
            onChange={(e) => setField('address_province', e.target.value)}
          />
          <Input
            label="Kode Pos"
            value={form.address_postal_code ?? ''}
            onChange={(e) => setField('address_postal_code', e.target.value)}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Wali / Orang Tua
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Nama Ayah"
            value={form.father_name ?? ''}
            onChange={(e) => setField('father_name', e.target.value)}
          />
          <Input
            label="Pekerjaan Ayah"
            value={form.father_occupation ?? ''}
            onChange={(e) => setField('father_occupation', e.target.value)}
          />
          <Input
            label="Telp Ayah"
            value={form.father_phone ?? ''}
            onChange={(e) => setField('father_phone', e.target.value)}
          />
          <Input
            label="Nama Ibu"
            value={form.mother_name ?? ''}
            onChange={(e) => setField('mother_name', e.target.value)}
          />
          <Input
            label="Pekerjaan Ibu"
            value={form.mother_occupation ?? ''}
            onChange={(e) => setField('mother_occupation', e.target.value)}
          />
          <Input
            label="Telp Ibu"
            value={form.mother_phone ?? ''}
            onChange={(e) => setField('mother_phone', e.target.value)}
          />
          <Input
            label="Nama Wali"
            value={form.guardian_name ?? ''}
            onChange={(e) => setField('guardian_name', e.target.value)}
          />
          <Input
            label="Hubungan Wali"
            value={form.guardian_relation ?? ''}
            onChange={(e) => setField('guardian_relation', e.target.value)}
          />
          <Input
            label="Telp Wali"
            value={form.guardian_phone ?? ''}
            onChange={(e) => setField('guardian_phone', e.target.value)}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Sekolah Asal
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Sekolah Asal"
            value={form.previous_school ?? ''}
            onChange={(e) => setField('previous_school', e.target.value)}
          />
          <Input
            type="number"
            label="Tahun Masuk"
            value={form.enrollment_year ?? ''}
            onChange={(e) => setField('enrollment_year', Number.parseInt(e.target.value, 10) || null)}
          />
        </div>
      </Card>
    </div>
  )
}
