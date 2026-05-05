import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, UserSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'
import { db } from '@/services/db'

interface StaffDossierForm {
  profile_id: string
  tenant_id: string
  nip: string | null
  nuptk: string | null
  nik: string | null
  place_of_birth: string | null
  date_of_birth: string | null
  gender: 'L' | 'P' | null
  employment_status: 'PNS' | 'PPPK' | 'GTT' | 'GTY' | 'HONORER' | 'TENAGA_HARIAN' | null
  employment_start: string | null
  education_level: string | null
  education_major: string | null
  teaching_certificate: string | null
  additional_duties: string[] | null
  phone: string | null
  address_summary: string | null
}

export function StaffDossier() {
  usePageTitle('Dossier Staf')
  const { profileId } = useParams<{ profileId: string }>()
  const { tenantId } = useAuth()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['staff_dossier', profileId],
    queryFn: async () => {
      if (!profileId) return null
      const { data, error } = await db
        .from<Array<StaffDossierForm>>('staff_dossier')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as StaffDossierForm | null
    },
    enabled: !!profileId,
  })

  const [form, setForm] = useState<Partial<StaffDossierForm>>({})
  useEffect(() => {
    if (dossier) setForm(dossier)
  }, [dossier])

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, profile_id: profileId!, tenant_id: tenantId! }
      const { data: existing } = await db
        .from<Array<StaffDossierForm>>('staff_dossier')
        .select('profile_id')
        .eq('profile_id', profileId!)
        .maybeSingle()
      if (existing) {
        const { error } = await db
          .from<Array<StaffDossierForm>>('staff_dossier')
          .update(payload)
          .eq('profile_id', profileId!)
        if (error) throw error
      } else {
        const { error } = await db.from<Array<StaffDossierForm>>('staff_dossier').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      addToast({ type: 'success', message: 'Dossier staf disimpan' })
      void qc.invalidateQueries({ queryKey: ['staff_dossier', profileId] })
    },
    onError: (err) =>
      addToast({
        type: 'error',
        message: 'Gagal menyimpan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      }),
  })

  function setField<K extends keyof StaffDossierForm>(key: K, value: StaffDossierForm[K]) {
    setForm((s) => ({ ...s, [key]: value }))
  }

  if (!profileId) return <div className="p-8 text-sm text-slate-500">Profile ID tidak ditemukan.</div>
  if (isLoading) return <div className="p-8 text-sm text-slate-500">Memuat...</div>

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <UserSquare className="w-6 h-6 text-indigo-500" />
          Dossier Staf
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
          Identitas Pegawai
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="NIP (18 digit)"
            value={form.nip ?? ''}
            onChange={(e) => setField('nip', e.target.value)}
            maxLength={18}
          />
          <Input
            label="NUPTK (16 digit)"
            value={form.nuptk ?? ''}
            onChange={(e) => setField('nuptk', e.target.value)}
            maxLength={16}
          />
          <Input
            label="NIK"
            value={form.nik ?? ''}
            onChange={(e) => setField('nik', e.target.value)}
            maxLength={16}
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
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Status Kepegawaian
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={form.employment_status ?? ''}
            onChange={(e) =>
              setField(
                'employment_status',
                (e.target.value || null) as StaffDossierForm['employment_status'],
              )
            }
          >
            <option value="">—</option>
            <option value="PNS">PNS</option>
            <option value="PPPK">PPPK</option>
            <option value="GTT">GTT (Guru Tidak Tetap)</option>
            <option value="GTY">GTY (Guru Tetap Yayasan)</option>
            <option value="HONORER">Honorer</option>
            <option value="TENAGA_HARIAN">Tenaga Harian</option>
          </select>
          <Input
            type="date"
            label="Mulai Bertugas"
            value={form.employment_start ?? ''}
            onChange={(e) => setField('employment_start', e.target.value)}
          />
          <Input
            label="Pendidikan Terakhir"
            placeholder="S1 / S2 / D3"
            value={form.education_level ?? ''}
            onChange={(e) => setField('education_level', e.target.value)}
          />
          <Input
            label="Jurusan"
            value={form.education_major ?? ''}
            onChange={(e) => setField('education_major', e.target.value)}
          />
          <Input
            label="Sertifikat Pendidik (no.)"
            value={form.teaching_certificate ?? ''}
            onChange={(e) => setField('teaching_certificate', e.target.value)}
            className="md:col-span-2"
          />
          <Input
            label="Telepon"
            value={form.phone ?? ''}
            onChange={(e) => setField('phone', e.target.value)}
          />
          <Input
            label="Alamat Ringkas"
            value={form.address_summary ?? ''}
            onChange={(e) => setField('address_summary', e.target.value)}
          />
        </div>
      </Card>
    </div>
  )
}
