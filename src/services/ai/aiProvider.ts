/**
 * AI provider unified interface (Fase 6).
 *
 * AUTHORITATIVE per runbook §2:
 *   - Groq for latency-sensitive endpoints (autocomplete, lesson Q&A streaming)
 *   - Anthropic Sonnet for quality (rapor narratives, principal insights, plagiarism explanations)
 *
 * Both providers go through the backend proxy `/api/v1/ai/chat` to keep keys
 * server-side. This module is a thin client wrapper — no API keys live here.
 */

import { readVilSession } from "@/services/auth/vilSession";

export type AiProvider = "groq" | "anthropic";

export interface AiCompletionRequest {
  provider: AiProvider;
  model?: string; // optional override
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AiCompletionResult {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  provider: AiProvider;
  model: string;
}

export const aiProvider = {
  /**
   * Single-shot completion. Fits short prompts (<2k input tokens). For long
   * streaming flows (lesson Q&A tutor), use streamCompletion below.
   */
  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const apiUrl = import.meta.env.VITE_API_URL ?? "";
    const token = readVilSession()?.access_token;

    const response = await fetch(`${apiUrl}/api/v1/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        provider: req.provider,
        model: req.model ?? defaultModel(req.provider),
        messages: req.messages,
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.7,
        metadata: req.metadata,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err.error ?? `AI request gagal (HTTP ${response.status})`,
      );
    }

    const result = await response.json();
    const data = result.data ?? result;
    return {
      content: data.content ?? "",
      tokensInput: data.tokensInput ?? data.tokens_input ?? 0,
      tokensOutput: data.tokensOutput ?? data.tokens_output ?? 0,
      provider: data.provider ?? req.provider,
      model: data.model ?? req.model ?? defaultModel(req.provider),
    };
  },

  /**
   * Streaming completion via SSE. Returns an async generator yielding chunks.
   */
  async *streamCompletion(
    req: AiCompletionRequest,
  ): AsyncGenerator<string, void, unknown> {
    const apiUrl = import.meta.env.VITE_API_URL ?? "";
    const token = readVilSession()?.access_token;

    const response = await fetch(`${apiUrl}/api/v1/ai/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        provider: req.provider,
        model: req.model ?? defaultModel(req.provider),
        messages: req.messages,
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`AI stream gagal (HTTP ${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const evt of events) {
        if (!evt.trim()) continue;
        const dataLine = evt.split("\n").find((l) => l.startsWith("data: "));
        if (!dataLine) continue;
        const json = dataLine.slice(6).trim();
        if (json === "[DONE]") return;
        try {
          const parsed = JSON.parse(json);
          const chunk = parsed.delta ?? parsed.content ?? "";
          if (chunk) yield chunk;
        } catch {
          // ignore malformed chunks
        }
      }
    }
  },
};

function defaultModel(provider: AiProvider): string {
  return provider === "groq" ? "llama-3.3-70b-versatile" : "claude-sonnet-4-6";
}

// ──────────────────────────────────────────────────────────────────────────
// High-level helpers — Fase 6 use cases
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generate per-mapel rapor narrative (Fase 3 Unit 29).
 * Uses Anthropic Sonnet for quality.
 */
export async function generateRaporSubjectNarrative(input: {
  studentName: string;
  subjectName: string;
  scoreSummary: string;
  cpAchievements: string[];
}): Promise<string> {
  const result = await aiProvider.complete({
    provider: "anthropic",
    messages: [
      {
        role: "system",
        content:
          "Anda adalah asisten guru yang menulis deskripsi capaian rapor Kurmer. Tulis dalam 2-3 kalimat dalam Bahasa Indonesia formal, fokus pada penguasaan CP/ATP, hindari penilaian kepribadian.",
      },
      {
        role: "user",
        content: `Siswa: ${input.studentName}\nMapel: ${input.subjectName}\nRingkasan nilai: ${input.scoreSummary}\nCP/ATP yang dikuasai: ${input.cpAchievements.join("; ")}\n\nTulis deskripsi capaian:`,
      },
    ],
    maxTokens: 256,
    temperature: 0.5,
  });
  return result.content.trim();
}

/**
 * Principal monthly insight narrative (Fase 6 Unit 45).
 */
export async function generatePrincipalInsight(input: {
  schoolName: string;
  monthLabel: string;
  metricsJson: Record<string, unknown>;
}): Promise<string> {
  const result = await aiProvider.complete({
    provider: "anthropic",
    messages: [
      {
        role: "system",
        content:
          "Anda asisten kepala sekolah. Berikan wawasan bulanan dalam Bahasa Indonesia: 1 paragraf trend, 1 paragraf area perhatian, 1 paragraf rekomendasi konkret. Maksimal 250 kata total.",
      },
      {
        role: "user",
        content: `Sekolah: ${input.schoolName}\nBulan: ${input.monthLabel}\nMetrik: ${JSON.stringify(input.metricsJson, null, 2)}`,
      },
    ],
    maxTokens: 600,
    temperature: 0.4,
  });
  return result.content.trim();
}

/**
 * Parent weekly digest (Fase 6 Unit 46).
 */
export async function generateParentWeeklyDigest(input: {
  studentName: string;
  weekLabel: string;
  activitiesJson: Record<string, unknown>;
}): Promise<string> {
  const result = await aiProvider.complete({
    provider: "groq",
    messages: [
      {
        role: "system",
        content:
          "Anda asisten yang menulis ringkasan mingguan untuk orang tua siswa SMA. Tulis dalam Bahasa Indonesia hangat dan singkat (3-4 kalimat). Fokus pada pencapaian + 1 hal yang perlu dukungan ortu.",
      },
      {
        role: "user",
        content: `Anak: ${input.studentName}\nMinggu: ${input.weekLabel}\nAktivitas: ${JSON.stringify(input.activitiesJson)}`,
      },
    ],
    maxTokens: 300,
    temperature: 0.6,
  });
  return result.content.trim();
}
