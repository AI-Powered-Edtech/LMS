import { Loader2, MailWarning, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { generateParentWeeklyDigest } from "@/services/ai/aiProvider";
import { db } from "@/services/db";

interface ParentDigestPreviewProps {
  studentId: string;
  studentName: string;
  parentId: string;
  /** Activity data for the week — typically pulled from analytics_audit + lesson_progress + grades. */
  weekStartIso: string;
  activitySummary: Record<string, unknown>;
}

/**
 * Parent weekly digest preview + send (Fase 6 Unit 46).
 *
 * Generates a Bahasa Indonesia summary from activity data, shows the parent
 * a preview, then on confirm persists to parent_weekly_digests + queues an
 * outbound_messages row for delivery (cron worker picks up).
 */
export function ParentDigestPreview({
  studentId,
  studentName,
  parentId,
  weekStartIso,
  activitySummary,
}: ParentDigestPreviewProps) {
  const { tenantId } = useAuth();
  const { addToast } = useToast();
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const text = await generateParentWeeklyDigest({
        studentName,
        weekLabel: new Date(weekStartIso).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        activitiesJson: activitySummary,
      });
      setSummary(text);
    } catch (err) {
      addToast({
        type: "error",
        message: "Gagal menghasilkan ringkasan",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSend() {
    if (!summary || !tenantId) return;
    setIsSending(true);
    try {
      // Persist digest
      const { error: insertErr } = await db
        .from("parent_weekly_digests")
        .upsert({
          tenant_id: tenantId,
          parent_id: parentId,
          student_id: studentId,
          week_start: weekStartIso,
          summary,
          activity_json: activitySummary,
          sent_via: ["email"],
        });
      if (insertErr) throw insertErr;

      // Queue outbound message (worker delivers)
      const { data: parentProfile } = await db
        .from("profiles")
        .select("email, phone")
        .eq("id", parentId)
        .maybeSingle();
      const email = (parentProfile as { email?: string } | null)?.email;

      if (email) {
        await db.from("outbound_messages").insert({
          tenant_id: tenantId,
          channel: "email",
          provider: "pending",
          to_address: email,
          payload: {
            subject: `Ringkasan minggu ini — ${studentName}`,
            body: summary,
          },
          related_id: studentId,
          related_type: "parent_weekly_digest",
        });
      }

      addToast({
        type: "success",
        message: "Ringkasan dikirim ke antrian email",
      });
      setSummary(null);
    } catch (err) {
      addToast({
        type: "error",
        message: "Gagal mengirim",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Ringkasan Mingguan AI
        </h3>
        {!summary && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            icon={
              isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )
            }
          >
            {isGenerating ? "Memproses..." : "Hasilkan"}
          </Button>
        )}
      </div>

      {summary ? (
        <div className="space-y-3">
          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3">
            {summary}
          </div>
          <div className="flex items-center justify-between text-xs">
            <p className="text-slate-500 italic flex items-center gap-1">
              <MailWarning className="w-3.5 h-3.5" />
              Akan dikirim via email — pastikan ortu sudah terdaftar.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSummary(null)}
              >
                Tolak
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSend}
                disabled={isSending}
              >
                {isSending ? "Mengirim..." : "Kirim ke Ortu"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Klik "Hasilkan" untuk membuat ringkasan AI dari aktivitas siswa minggu
          ini.
        </p>
      )}
    </Card>
  );
}
