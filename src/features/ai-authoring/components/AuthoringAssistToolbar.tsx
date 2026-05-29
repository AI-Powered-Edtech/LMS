/**
 * AuthoringAssist toolbar — Workstream G1.
 *
 * Inline AI helpers for the Course Builder text block:
 *   - "Tulis paragraf"      → expand a topic into a paragraph
 *   - "Buat pertanyaan"     → produce 3 comprehension questions
 *   - "Sederhanakan bahasa" → rewrite current text in simpler Indonesian
 *
 * Uses the shared `aiProvider` (Groq for low latency). Streams are not
 * required here — these are single-shot edits.
 */

import { useState } from "react";

import { aiProvider } from "@/services/ai/aiProvider";

type ActionId = "paragraph" | "questions" | "simplify";

const ACTIONS: {
  id: ActionId;
  label: string;
  system: string;
  userPrompt: (current: string) => string;
}[] = [
  {
    id: "paragraph",
    label: "Tulis paragraf",
    system:
      "Kamu adalah penulis materi pembelajaran berbahasa Indonesia. Tulis paragraf pengantar ringkas (3–5 kalimat), gaya formal namun mudah dipahami siswa SMA.",
    userPrompt: (current) =>
      current.trim()
        ? `Lanjutkan / kembangkan tulisan berikut menjadi paragraf utuh:\n\n${current}`
        : "Tulis paragraf pengantar untuk topik baru. Sertakan definisi singkat dan satu contoh konkret.",
  },
  {
    id: "questions",
    label: "Buat pertanyaan",
    system:
      "Kamu membuat soal pemahaman berbahasa Indonesia untuk siswa SMA. Output: tepat 3 pertanyaan, bernomor 1–3, tanpa kunci jawaban.",
    userPrompt: (current) =>
      `Berdasarkan materi berikut, buat 3 pertanyaan pemahaman:\n\n${current || "(materi kosong — buat pertanyaan umum tentang topik yang diberikan)"}`,
  },
  {
    id: "simplify",
    label: "Sederhanakan bahasa",
    system:
      "Kamu menyederhanakan teks pembelajaran berbahasa Indonesia. Pertahankan makna; gunakan kosakata umum dan kalimat pendek (≤ 18 kata).",
    userPrompt: (current) =>
      `Tulis ulang teks berikut dengan bahasa yang lebih sederhana:\n\n${current}`,
  },
];

export interface AuthoringAssistToolbarProps {
  current: string;
  onInsert: (next: string) => void;
  className?: string;
}

export function AuthoringAssistToolbar({
  current,
  onInsert,
  className,
}: AuthoringAssistToolbarProps) {
  const [busy, setBusy] = useState<ActionId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: (typeof ACTIONS)[number]) {
    setBusy(action.id);
    setError(null);
    try {
      const result = await aiProvider.complete({
        provider: "groq",
        messages: [
          { role: "system", content: action.system },
          { role: "user", content: action.userPrompt(current) },
        ],
        maxTokens: 600,
        temperature: action.id === "questions" ? 0.4 : 0.6,
        metadata: { feature: "authoring_assist", action: action.id },
      });
      const generated = result.content.trim();
      if (!generated) {
        setError("AI tidak mengembalikan teks. Coba lagi.");
        return;
      }
      const merged = current.trim()
        ? `${current.trimEnd()}\n\n${generated}`
        : generated;
      onInsert(merged);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 ${className ?? ""}`}
      data-testid="authoring-assist-toolbar"
    >
      <span className="text-xs text-slate-500">AI Bantu:</span>
      {ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={busy !== null}
          onClick={() => void run(action)}
          data-testid={`authoring-assist-${action.id}`}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          {busy === action.id ? "…" : action.label}
        </button>
      ))}
      {error ? (
        <span role="alert" className="text-xs text-rose-600">
          {error}
        </span>
      ) : null}
    </div>
  );
}

