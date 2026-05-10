import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useLocaleFormatters } from "@/hooks/useLocaleFormatters";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";
import { generatePrincipalInsight } from "@/services/ai/aiProvider";
import { db } from "@/services/db";

interface PrincipalInsight {
  id: string;
  tenant_id: string;
  month: string;
  narrative: string;
  key_metrics: Record<string, unknown> | null;
  provider: string | null;
  model: string | null;
  generated_at: string;
}

async function listInsights(tenantId: string): Promise<PrincipalInsight[]> {
  const { data, error } = await db
    .from<Array<PrincipalInsight>>("principal_insights")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("month", { ascending: false })
    .limit(12);
  if (error) throw error;
  return (data ?? []) as PrincipalInsight[];
}

export function PrincipalInsights() {
  usePageTitle("Wawasan Bulanan");
  const { tenantId } = useAuth();
  const { addToast } = useToast();
  const { formatDate } = useLocaleFormatters();
  const qc = useQueryClient();

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["principal_insights", tenantId],
    queryFn: () => (tenantId ? listInsights(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    if (!tenantId) return;
    setIsGenerating(true);
    try {
      const monthIso = new Date().toISOString().slice(0, 7) + "-01";
      const monthLabel = formatDate(new Date(), {
        month: "long",
        year: "numeric",
      });

      // Stub metrics — Fase 6 will pull real numbers from analytics tables.
      const metrics = {
        siswa_aktif: 120,
        kehadiran_rata2: "92%",
        rapor_diterbitkan: 0,
        komentar_ortu_minggu_ini: 14,
      };

      const narrative = await generatePrincipalInsight({
        schoolName: "SMA Nusantara Dev",
        monthLabel,
        metricsJson: metrics,
      });

      const { error } = await db
        .from<Array<PrincipalInsight>>("principal_insights")
        .insert({
          tenant_id: tenantId,
          month: monthIso,
          narrative,
          key_metrics: metrics,
          provider: "anthropic",
          model: "claude-sonnet-4-6",
        });
      if (error) throw error;

      addToast({ type: "success", message: "Wawasan bulanan dihasilkan" });
      void qc.invalidateQueries({ queryKey: ["principal_insights", tenantId] });
    } catch (err) {
      addToast({
        type: "error",
        message: "Gagal menghasilkan wawasan",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            Wawasan Bulanan Kepala Sekolah
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ringkasan bulanan dihasilkan AI berdasarkan metrik sekolah.
          </p>
        </div>
        <Button
          variant="primary"
          icon={
            <RefreshCw
              className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`}
            />
          }
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? "Menghasilkan..." : "Hasilkan Bulan Ini"}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <div className="py-12 text-center text-sm text-slate-500">
            Memuat...
          </div>
        </Card>
      ) : insights.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-sm text-slate-500">
            Belum ada wawasan tersimpan. Klik tombol di atas untuk menghasilkan
            yang pertama.
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {insights.map((ins) => (
            <Card key={ins.id}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(ins.month, {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <span className="text-xs text-slate-500">
                  {ins.provider ? `via ${ins.provider}` : ""} ·{" "}
                  {formatDate(ins.generated_at)}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {ins.narrative}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
