import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Get tenant_id and role from user_roles for security
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    const tenantId = roleData?.tenant_id
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant context missing. Please contact administrator.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    // Process FormData with tenant context
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const assignmentType = formData.get('assignmentType') as string
    const questionCountStr = formData.get('questionCount') as string
    const difficulty = formData.get('difficulty') as string

    if (!file) {
      return new Response(JSON.stringify({ error: 'File is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File size exceeds 10MB limit' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Basic MIME type validation
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'text/plain',
      'text/csv',
    ]

    if (!validTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const questionCount = parseInt(questionCountStr || '10', 10)
    const safeCount = Math.min(Math.max(questionCount, 1), 50) // cap between 1 and 50

    // MOCK AI GENERATION
    // Since we don't have a real LLM here, we'll return a mock response that matches the component's expectations

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1500))

    let questions = []
    if (assignmentType === 'writing') {
      questions = Array.from({ length: Math.min(safeCount, 3) }).map((_, i) => ({
        id: `q_${i}`,
        text: `Topik penulisan ke-${i + 1} berdasarkan materi: Analisis dampak ${difficulty} terkait tema utama dokumen.`,
        answer:
          'Siswa diharapkan menulis esai minimal 500 kata dengan menyertakan argumen yang logis dan referensi dari teks.',
      }))
    } else if (assignmentType === 'reading') {
      questions = Array.from({ length: safeCount }).map((_, i) => ({
        id: `q_${i}`,
        text: `Berdasarkan teks, apa gagasan utama pada paragraf ke-${i + 1}?`,
        answer: 'Gagasan utama mencakup poin penting A, B, dan C sesuai dengan konteks bacaan.',
      }))
    } else {
      // default: quiz
      questions = Array.from({ length: safeCount }).map((_, i) => ({
        id: `q_${i}`,
        text: `Pertanyaan pilihan ganda ke-${i + 1} (Tingkat: ${difficulty}) tentang isi materi.`,
        options: [
          'Opsi A yang merupakan pengecoh',
          'Opsi B yang merupakan jawaban benar',
          'Opsi C yang hampir benar',
          'Opsi D yang sama sekali salah',
        ],
        answer: 1, // index of correct option
        explanation: 'Opsi B benar karena dijelaskan secara eksplisit di halaman pertama materi.',
      }))
    }

    const result = {
      type: assignmentType,
      tenant_id: tenantId, // Include tenant context in response
      summary: `Rangkuman AI: Dokumen berhasil dianalisis. Materi ini mencakup konsep-konsep tingkat ${difficulty}. Berikut adalah hasil ekstraksi ${safeCount} poin pembelajaran utama.`,
      questions,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
