import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";
import { db } from "@/services/db";

interface ParentLink {
  id: string;
  tenant_id: string;
  parent_id: string;
  student_id: string;
  relation: "ayah" | "ibu" | "wali";
  is_primary: boolean;
  receive_notifications: boolean;
  created_at: string;
}

async function listLinks(tenantId: string): Promise<ParentLink[]> {
  const { data, error } = await db
    .from<Array<ParentLink>>("parent_student_links")
    .select(
      "id, tenant_id, parent_id, student_id, relation, is_primary, receive_notifications, created_at",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ParentLink[];
}

export function ParentLinks() {
  usePageTitle("Tautan Orang Tua — Siswa");
  const { tenantId } = useAuth();
  const { addToast } = useToast();
  const qc = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["parent_student_links", tenantId],
    queryFn: () => (tenantId ? listLinks(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [parentId, setParentId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [relation, setRelation] = useState<"ayah" | "ibu" | "wali">("wali");
  const [isPrimary, setIsPrimary] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from<Array<ParentLink>>("parent_student_links")
        .insert({
          tenant_id: tenantId!,
          parent_id: parentId,
          student_id: studentId,
          relation,
          is_primary: isPrimary,
          receive_notifications: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      addToast({ type: "success", message: "Tautan dibuat" });
      setIsOpen(false);
      setParentId("");
      setStudentId("");
      void qc.invalidateQueries({
        queryKey: ["parent_student_links", tenantId],
      });
    },
    onError: (err) =>
      addToast({
        type: "error",
        message: "Gagal membuat tautan",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
      }),
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Link2 className="w-6 h-6 text-orange-500" />
            Tautan Orang Tua — Siswa
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hubungkan akun orang tua dengan siswa-nya untuk parent dashboard +
            notifikasi.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsOpen(true)}
        >
          Tautkan
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Memuat...
          </div>
        ) : links.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Belum ada tautan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3">Parent ID</th>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Relasi</th>
                  <th className="px-4 py-3">Primer</th>
                  <th className="px-4 py-3">Notifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {links.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">
                      {l.parent_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">
                      {l.student_id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 capitalize">{l.relation}</td>
                    <td className="px-4 py-2">
                      {l.is_primary ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Primer
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {l.receive_notifications ? "Ya" : "Tidak"}
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
            e.preventDefault();
            create.mutate();
          }}
        >
          <ModalHeader
            title="Tautkan Orang Tua ke Siswa"
            onClose={() => setIsOpen(false)}
          />
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Profile ID Orang Tua"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                placeholder="UUID parent profile"
                required
              />
              <Input
                label="Profile ID Siswa"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="UUID student profile"
                required
              />
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value as typeof relation)}
              >
                <option value="ayah">Ayah</option>
                <option value="ibu">Ibu</option>
                <option value="wali">Wali</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                />
                Tetapkan sebagai wali primer
              </label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={create.isPending}>
              {create.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
