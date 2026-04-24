import { Landmark, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/services/db'
import { useToast } from '@/hooks/useToast'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface BankVa {
  id: string
  tenant_id: string
  student_id: string
  bank_code: string
  va_number: string
  is_active: boolean
  created_at: string
}

const BANKS = ['BCA', 'BNI', 'BRI', 'MANDIRI', 'CIMB', 'PERMATA', 'DANAMON']

async function listVa(tenantId: string): Promise<BankVa[]> {
  const { data, error } = await db
    .from<Array<BankVa>>('bank_va_assignments')
    .select('id, tenant_id, student_id, bank_code, va_number, is_active, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []) as BankVa[]
}

export function BankVa() {
  usePageTitle('Virtual Account Bank')
  const { tenantId } = useAuth()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const { data: vaList = [], isLoading } = useQuery({
    queryKey: ['bank_va', tenantId],
    queryFn: () => (tenantId ? listVa(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  })

  const [isOpen, setIsOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [bankCode, setBankCode] = useState('BCA')
  const [vaNumber, setVaNumber] = useState('')

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from<Array<BankVa>>('bank_va_assignments')
        .insert({
          tenant_id: tenantId!,
          student_id: studentId,
          bank_code: bankCode,
          va_number: vaNumber,
          is_active: true,
        })
      if (error) throw error
    },
    onSuccess: () => {
      addToast({ type: 'success', message: `VA ${bankCode} ${vaNumber} ditambahkan` })
      setIsOpen(false)
      setStudentId('')
      setVaNumber('')
      void qc.invalidateQueries({ queryKey: ['bank_va', tenantId] })
    },
    onError: (err) =>
      addToast({
        type: 'error',
        message: 'Gagal menyimpan VA',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      }),
  })

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-6 h-6 text-blue-600" />
            Virtual Account Bank
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tetapkan nomor VA per siswa untuk pembayaran SPP via direct bank (alternatif Midtrans).
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
          Assign VA
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Memuat...</div>
        ) : vaList.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Belum ada VA terdaftar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Nomor VA</th>
                  <th className="px-4 py-3">Siswa ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dibuat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {vaList.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-semibold">{v.bank_code}</td>
                    <td className="px-4 py-3 font-mono text-xs">{v.va_number}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {v.student_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${v.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}
                      >
                        {v.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(v.created_at).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={isOpen} onClose={() => setIsOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <ModalHeader title="Assign Virtual Account" onClose={() => setIsOpen(false)} />
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Profile ID Siswa"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="UUID siswa"
                required
              />
              <select value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
                {BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <Input
                label="Nomor VA"
                value={vaNumber}
                onChange={(e) => setVaNumber(e.target.value)}
                placeholder="Contoh: 8888001234567890"
                required
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={create.isPending}>
              {create.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
