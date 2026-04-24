import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui'
import { useAcademicYears } from '../queries/useAcademicYears'
import type { AcademicYear, AcademicYearFormData } from '../types'

export function AcademicYearManager() {
  const { query, createMutation, updateMutation, deleteMutation } = useAcademicYears()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicYear | null>(null)
  
  const [formData, setFormData] = useState<AcademicYearFormData>({
    name: '',
    start_date: '',
    end_date: '',
    is_active: false,
  })

  const handleOpenNew = () => {
    setEditing(null)
    setFormData({ name: '', start_date: '', end_date: '', is_active: false })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: AcademicYear) => {
    setEditing(item)
    setFormData({
      name: item.name,
      start_date: item.start_date,
      end_date: item.end_date,
      is_active: item.is_active,
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Yakin hapus tahun akademik ini?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      updateMutation.mutate({ id: editing.id, updates: formData }, {
        onSuccess: () => setIsModalOpen(false)
      })
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => setIsModalOpen(false)
      })
    }
  }

  if (query.isLoading) return <div>Memuat data...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Tahun Akademik</h2>
          <p className="text-gray-500 dark:text-gray-400">Kelola tahun akademik</p>
        </div>
        <Button onClick={handleOpenNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tambah
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
            <tr>
              <th className="py-3 px-4 font-medium dark:text-gray-200">Nama</th>
              <th className="py-3 px-4 font-medium dark:text-gray-200">Mulai</th>
              <th className="py-3 px-4 font-medium dark:text-gray-200">Selesai</th>
              <th className="py-3 px-4 font-medium dark:text-gray-200">Status</th>
              <th className="py-3 px-4 font-medium dark:text-gray-200 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.map(item => (
              <tr key={item.id} className="border-b dark:border-gray-700">
                <td className="py-3 px-4 dark:text-gray-300">{item.name}</td>
                <td className="py-3 px-4 dark:text-gray-300">{item.start_date}</td>
                <td className="py-3 px-4 dark:text-gray-300">{item.end_date}</td>
                <td className="py-3 px-4 dark:text-gray-300">{item.is_active ? 'Aktif' : 'Tidak Aktif'}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader>
          {editing ? 'Edit Tahun Akademik' : 'Tambah Tahun Akademik'}
        </ModalHeader>
        <ModalBody>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nama</label>
            <input
              required
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal Mulai</label>
            <input
              type="date"
              required
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              value={formData.start_date}
              onChange={e => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tanggal Selesai</label>
            <input
              type="date"
              required
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              value={formData.end_date}
              onChange={e => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <label htmlFor="isActive" className="text-sm font-medium">Aktif</label>
          </div>
                    </form>
        </ModalBody>
        <ModalFooter>
          <div className="flex justify-end gap-2 w-full">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} type="submit">Simpan</Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  )
}
