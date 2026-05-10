import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
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
import { akmService } from "@/features/akm/api/akmService";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";

export function AkmStimuli() {
  usePageTitle("Stimulus AKM");
  const { tenantId, user } = useAuth();
  const { addToast } = useToast();
  const qc = useQueryClient();

  const { data: stimuli = [], isLoading } = useQuery({
    queryKey: ["question_stimuli", tenantId],
    queryFn: () => (tenantId ? akmService.list(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<
    "image" | "video" | "audio" | "pdf" | ""
  >("");
  const [source, setSource] = useState("");

  const create = useMutation({
    mutationFn: () =>
      akmService.create({
        tenantId: tenantId!,
        title: title || undefined,
        body,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaType || undefined,
        source: source || undefined,
        createdBy: user?.id ?? null,
      }),
    onSuccess: () => {
      addToast({ type: "success", message: "Stimulus dibuat" });
      setIsOpen(false);
      setTitle("");
      setBody("");
      setMediaUrl("");
      setSource("");
      void qc.invalidateQueries({ queryKey: ["question_stimuli", tenantId] });
    },
    onError: (err) =>
      addToast({
        type: "error",
        message: "Gagal menyimpan stimulus",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
      }),
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-500" />
            Stimulus AKM
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bacaan / chart / video yang dipakai sebagai konteks soal AKM. Satu
            stimulus dapat dipakai oleh banyak soal di Quiz Manager.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsOpen(true)}
        >
          Stimulus Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <p className="text-sm text-slate-500 col-span-full text-center py-12">
            Memuat...
          </p>
        ) : stimuli.length === 0 ? (
          <p className="text-sm text-slate-500 col-span-full text-center py-12">
            Belum ada stimulus.
          </p>
        ) : (
          stimuli.map((s) => (
            <Card key={s.id}>
              {s.title && (
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  {s.title}
                </h3>
              )}
              {s.media_url && s.media_type === "image" && (
                <img
                  src={s.media_url}
                  alt={s.title ?? "Stimulus"}
                  className="w-full h-40 object-cover rounded mb-3"
                  loading="lazy"
                />
              )}
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-4 whitespace-pre-wrap">
                {s.body}
              </p>
              {s.source && (
                <p className="text-xs text-slate-400 italic mt-2">
                  Sumber: {s.source}
                </p>
              )}
            </Card>
          ))
        )}
      </div>

      <Modal open={isOpen} onClose={() => setIsOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <ModalHeader
            title="Stimulus AKM Baru"
            onClose={() => setIsOpen(false)}
          />
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Judul (opsional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bacaan / Konten
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  rows={6}
                  placeholder="Tulis paragraf bacaan, deskripsi gambar/grafik, transkrip video, dst."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="URL Media (opsional)"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
                <select
                  value={mediaType}
                  onChange={(e) =>
                    setMediaType(e.target.value as typeof mediaType)
                  }
                >
                  <option value="">— tidak ada —</option>
                  <option value="image">Gambar</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <Input
                label="Sumber / Sitasi"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
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
