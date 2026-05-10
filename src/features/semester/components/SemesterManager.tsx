import { Calendar, Clock, Edit2, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  useToast,
} from "@/components/ui";
import { useLocaleFormatters } from "@/hooks/useLocaleFormatters";

import {
  useCloseSemester,
  useCreateSemester,
  useSemesters,
  useUpdateSemester,
} from "../queries/useSemesters";
import type { Semester, SemesterFormData } from "../types";

const statusLabels: Record<string, string> = {
  draft: "Draf",
  active: "Aktif",
  closing: "Menutup",
  closed: "Tertutup",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closing:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function SemesterForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Semester;
  onSubmit: (data: SemesterFormData) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [academicYear, setAcademicYear] = useState(
    initial?.academic_year ?? "",
  );
  const [term, setTerm] = useState<string>(initial?.term?.toString() ?? "1");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      academic_year: academicYear,
      term: parseInt(term) as 1 | 2,
      start_date: startDate,
      end_date: endDate,
    });
  };

  const termOptions = [
    { value: "1", label: "Ganjil (1)" },
    { value: "2", label: "Genap (2)" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nama Semester
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Semester Ganjil 2025/2026"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tahun Ajaran
        </label>
        <Input
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          placeholder="2025/2026"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Semester
        </label>
        <Select
          options={termOptions}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Pilih semester"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tanggal Mulai
          </label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tanggal Selesai
          </label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="secondary" onClick={onCancel} type="button">
          Batal
        </Button>
        <Button type="submit">
          {initial ? "Simpan Perubahan" : "Buat Semester"}
        </Button>
      </div>
    </form>
  );
}

export function SemesterManager() {
  const { data: semesters, isLoading } = useSemesters();
  const createMutation = useCreateSemester();
  const updateMutation = useUpdateSemester();
  const closeMutation = useCloseSemester();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Semester | null>(null);
  const [pendingClose, setPendingClose] = useState<Semester | null>(null);
  const { addToast } = useToast();
  const { formatDate } = useLocaleFormatters();

  const handleCreate = (data: SemesterFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setModalOpen(false);
        addToast?.({ type: "success", message: "Semester berhasil dibuat" });
      },
    });
  };

  const handleUpdate = (data: SemesterFormData) => {
    if (!editing) return;
    updateMutation.mutate(
      { id: editing.id, data },
      {
        onSuccess: () => {
          setModalOpen(false);
          setEditing(null);
          addToast?.({
            type: "success",
            message: "Semester berhasil diperbarui",
          });
        },
      },
    );
  };

  const handleClose = (semester: Semester) => {
    setPendingClose(semester);
  };

  const confirmCloseSemester = () => {
    if (!pendingClose) return;
    closeMutation.mutate(pendingClose.id, {
      onSuccess: () => {
        setPendingClose(null);
        addToast?.({ type: "success", message: "Semester berhasil ditutup" });
      },
    });
  };

  const handleEdit = (semester: Semester) => {
    setEditing(semester);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manajemen Semester
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kelola semester akademik dan proses penutupan
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Semester
        </Button>
      </div>

      <Card>
        <div className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5" />
            Daftar Semester
          </h2>

          {isLoading ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Memuat data semester...
            </div>
          ) : semesters?.length === 0 ? (
            <EmptyState
              title="Belum ada semester"
              description='Klik "Tambah Semester" untuk memulai.'
              icon={<Calendar className="h-8 w-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Nama
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Tahun Ajaran
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Periode
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {semesters?.map((semester) => (
                    <tr
                      key={semester.id}
                      className="border-b dark:border-gray-700"
                    >
                      <td className="py-3 px-2 font-medium dark:text-gray-200">
                        {semester.name}
                      </td>
                      <td className="py-3 px-2 dark:text-gray-300">
                        {semester.academic_year}
                      </td>
                      <td className="py-3 px-2 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(semester.start_date, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          -{" "}
                          {formatDate(semester.end_date, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={statusColors[semester.status] ?? ""}>
                          {statusLabels[semester.status] ?? semester.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end gap-2">
                          {semester.status !== "closed" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEdit(semester)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {semester.status === "active" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleClose(semester)}
                              disabled={closeMutation.isPending}
                            >
                              Tutup
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={pendingClose !== null}
        title="Tutup semester?"
        description={`Semester "${pendingClose?.name ?? ""}" akan ditutup. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Tutup Semester"
        variant="danger"
        isLoading={closeMutation.isPending}
        onCancel={() => setPendingClose(null)}
        onConfirm={confirmCloseSemester}
      />

      <Modal open={modalOpen} onClose={handleModalClose} size="md">
        <ModalHeader
          title={editing ? "Edit Semester" : "Buat Semester Baru"}
          onClose={handleModalClose}
        />
        <ModalBody>
          <SemesterForm
            initial={editing ?? undefined}
            onSubmit={editing ? handleUpdate : handleCreate}
            onCancel={handleModalClose}
          />
        </ModalBody>
        <ModalFooter>
          <div />
        </ModalFooter>
      </Modal>
    </div>
  );
}
