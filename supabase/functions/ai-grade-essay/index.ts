import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const LLM_TIMEOUT_MS = 15000; // 15s

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status
    });
}

function errorResponse(message: string, status = 500) {
    return jsonResponse({ error: message }, status);
}

// Ensure the user is authenticated and is a teacher or admin
async function authenticate(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('AUTH_MISSING');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('SUPABASE_CONFIG_MISSING');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('AUTH_INVALID');

    // Assuming user metadata or another table holds the role.
    // Here we check if tenant_id exists in metadata and assume valid user for now.
    // In a real application, you'd check a 'roles' table or user_metadata.role
    const role = user.user_metadata?.role;
    if (role === 'student') {
        throw new Error('UNAUTHORIZED_ROLE');
    }

    return { user, supabaseClient };
}

async function callGroq(messages: any[]) {
    const model = 'llama-3.1-70b-versatile';
    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) throw new Error('GROQ_CONFIG_MISSING');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.1, // Low temperature for more deterministic grading
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`GROQ_API_ERROR_${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('GROQ_EMPTY_RESPONSE');

        return JSON.parse(text);
    } catch (e: any) {
        if (e.name === 'AbortError') throw new Error('LLM_TIMEOUT');
        throw e;
    } finally {
        clearTimeout(timeout);
    }
}

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { user } = await authenticate(req);

        const { submissionId, essayText, rubric } = await req.json();

        if (!essayText || !rubric || !Array.isArray(rubric)) {
            return errorResponse('Missing required parameters: essayText and rubric', 400);
        }

        if (essayText.length > 10000) {
            return errorResponse('Essay text exceeds maximum length of 10000 characters', 400);
        }

        const rubricText = rubric.map((r: any) => `- ${r.criterion} (Max Score: ${r.maxPoints || r.maxScore}): ${r.description || ''}`).join('\n');

        const systemPrompt = `You are an expert, strict, and fair teacher evaluating an essay.
You will evaluate the essay strictly according to the provided rubric criteria.
For each criterion, assign a score up to the max points specified and write a brief, constructive feedback note.
Finally, provide an overall feedback summary.
Always output a JSON object with exactly these three keys:
- "scores": an object mapping the exact criterion names to their numeric score.
- "feedback": an object mapping the exact criterion names to their specific feedback string.
- "overallFeedback": a string summarizing the overall feedback.

Example Output format:
{
  "scores": {
    "Tata Bahasa & Ejaan": 30,
    "Kualitas Argumen": 45
  },
  "feedback": {
    "Tata Bahasa & Ejaan": "Beberapa kesalahan minor namun tidak mengganggu pemahaman.",
    "Kualitas Argumen": "Argumen cukup kuat tetapi beberapa bukti kurang relevan."
  },
  "overallFeedback": "Tulisan yang baik dengan argumen solid, namun perhatikan lagi bukti pendukung dan ejaan."
}`;

        const userPrompt = `Rubric:\n${rubricText}\n\nEssay:\n${essayText}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        const aiResult = await callGroq(messages);

        // Very basic structural validation
        if (!aiResult.scores || !aiResult.feedback || !aiResult.overallFeedback) {
            throw new Error('AI_INVALID_FORMAT');
        }

        return jsonResponse(aiResult);
    } catch (err: any) {
        console.error('ai_grade_error:', err);

        if (err.message === 'UNAUTHORIZED_ROLE') return errorResponse('Unauthorized: Students cannot grade essays.', 403);
        if (err.message === 'AUTH_MISSING' || err.message === 'AUTH_INVALID') return errorResponse('Unauthorized', 401);
        if (err.message === 'LLM_TIMEOUT') return errorResponse('AI_GRADING_TIMEOUT', 504);

        return errorResponse('AI_GRADING_FAILED', 500);
    }
});
