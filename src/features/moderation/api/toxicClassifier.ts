import { aiProvider } from "@/services/ai/aiProvider";
import { db } from "@/services/db";

/**
 * Toxic content moderation classifier (Fase 6 Unit 47).
 *
 * Classifies user-generated text against safety categories. Logs every check
 * to moderation_classifications. Returns a synthesized flag that the calling
 * surface (forum, announcement, comment) uses to gate publication or queue
 * for human review.
 *
 * AUTHORITATIVE: uses Groq for latency (called inline during post submission).
 */

export interface ToxicClassification {
  isToxic: boolean;
  confidence: number;
  categories: string[];
  rawResponse: string;
}

const SYSTEM_PROMPT = `Anda adalah moderator konten untuk platform sekolah Indonesia (siswa SMA).
Klasifikasi teks berikut. Kembalikan HANYA JSON valid dengan shape:
{"toxic": <boolean>, "confidence": <0..1>, "categories": [<list>]}

Kategori yang mungkin: ["hate", "sexual", "self_harm", "violence", "bullying", "spam", "off_topic"]
Klasifikasi ketat tapi tidak overzealous — diskusi pelajaran tentang sejarah perang ATAU isu sensitif untuk tujuan edukasi BUKAN toxic.
Bahasa kasar slang remaja yang menargetkan individu ATAU mengandung penghinaan SAR ADALAH toxic.
Untuk bullying: harus ada targeting personal yang merendahkan, bukan kritik konstruktif.`;

export async function classifyText(input: {
  text: string;
  tenantId: string;
  targetType: string;
  targetId: string;
}): Promise<ToxicClassification> {
  const result = await aiProvider.complete({
    provider: "groq",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: input.text.slice(0, 2000) },
    ],
    maxTokens: 150,
    temperature: 0.1,
  });

  // Parse JSON from response — Groq sometimes wraps in markdown fences.
  const cleaned = result.content
    .replace(/```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: { toxic?: boolean; confidence?: number; categories?: string[] };
  try {
    parsed = JSON.parse(cleaned) as typeof parsed;
  } catch {
    // Fallback: assume non-toxic if parse fails (don't block legitimate posts).
    parsed = { toxic: false, confidence: 0, categories: [] };
  }

  const classification: ToxicClassification = {
    isToxic: parsed.toxic === true,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    rawResponse: result.content,
  };

  // Log to moderation_classifications (best-effort, never blocks the call).
  try {
    await db.from("moderation_classifications").insert({
      tenant_id: input.tenantId,
      target_type: input.targetType,
      target_id: input.targetId,
      classifier: result.model,
      is_toxic: classification.isToxic,
      confidence: classification.confidence,
      categories: classification.categories,
    });
  } catch {
    // intentional swallow — classification result still returned to caller
  }

  return classification;
}
