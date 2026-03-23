// EduSync LMS — PDF Certificate Generator Edge Function
// Generates landscape A4 PDF certificates using pdf-lib

import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CertificateData {
  studentName: string
  courseTitle: string
  completionDate: string
  tenantName: string
  certificateNumber: string
}

interface RequestBody {
  type: 'certificate'
  data: CertificateData
}

/* ─── Helpers ──────────────────────────────────────────────── */

function drawBorder(page: ReturnType<PDFDocument['addPage']>, width: number, height: number) {
  const borderColor = rgb(0.145, 0.388, 0.922) // #2563eb
  const goldColor = rgb(0.757, 0.604, 0.227) // gold accent

  // Outer border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor,
    borderWidth: 3,
  })

  // Inner border
  page.drawRectangle({
    x: 35,
    y: 35,
    width: width - 70,
    height: height - 70,
    borderColor: goldColor,
    borderWidth: 1.5,
  })

  // Corner decorations (small squares at each inner border corner)
  const cornerSize = 12
  const corners = [
    { x: 35, y: 35 },
    { x: width - 35 - cornerSize, y: 35 },
    { x: 35, y: height - 35 - cornerSize },
    { x: width - 35 - cornerSize, y: height - 35 - cornerSize },
  ]
  for (const corner of corners) {
    page.drawRectangle({
      x: corner.x,
      y: corner.y,
      width: cornerSize,
      height: cornerSize,
      color: goldColor,
    })
  }

  // Decorative horizontal lines
  const lineY1 = height - 140
  const lineY2 = 100
  page.drawLine({
    start: { x: 80, y: lineY1 },
    end: { x: width - 80, y: lineY1 },
    thickness: 1,
    color: goldColor,
  })
  page.drawLine({
    start: { x: 80, y: lineY2 },
    end: { x: width - 80, y: lineY2 },
    thickness: 1,
    color: goldColor,
  })
}

/* ─── Main Handler ─────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth check ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token autentikasi diperlukan' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token tidak valid atau kedaluwarsa' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse body ──
    const body: RequestBody = await req.json()

    if (body.type !== 'certificate') {
      return new Response(
        JSON.stringify({ error: 'Tipe dokumen tidak didukung. Gunakan "certificate".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { studentName, courseTitle, completionDate, tenantName, certificateNumber } = body.data

    if (!studentName || !courseTitle || !completionDate || !tenantName || !certificateNumber) {
      return new Response(JSON.stringify({ error: 'Semua field data sertifikat wajib diisi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Generate PDF ──
    const pdfDoc = await PDFDocument.create()

    // Landscape A4: 841.89 x 595.28 points
    const pageWidth = 841.89
    const pageHeight = 595.28
    const page = pdfDoc.addPage([pageWidth, pageHeight])

    // Fonts
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

    // Colors
    const primaryBlue = rgb(0.145, 0.388, 0.922)
    const darkText = rgb(0.1, 0.1, 0.1)
    const grayText = rgb(0.35, 0.35, 0.35)

    // Background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(0.99, 0.99, 1),
    })

    // Borders and decorations
    drawBorder(page, pageWidth, pageHeight)

    // ── Content ──
    const centerX = pageWidth / 2

    // EduSync branding
    const brandText = 'EduSync'
    const brandWidth = fontBold.widthOfTextAtSize(brandText, 14)
    page.drawText(brandText, {
      x: centerX - brandWidth / 2,
      y: pageHeight - 80,
      size: 14,
      font: fontBold,
      color: primaryBlue,
    })

    // Title
    const title = 'SERTIFIKAT PENYELESAIAN'
    const titleWidth = fontBold.widthOfTextAtSize(title, 28)
    page.drawText(title, {
      x: centerX - titleWidth / 2,
      y: pageHeight - 120,
      size: 28,
      font: fontBold,
      color: primaryBlue,
    })

    // "Diberikan kepada" label
    const awardLabel = 'Diberikan kepada:'
    const awardLabelWidth = fontItalic.widthOfTextAtSize(awardLabel, 13)
    page.drawText(awardLabel, {
      x: centerX - awardLabelWidth / 2,
      y: pageHeight - 180,
      size: 13,
      font: fontItalic,
      color: grayText,
    })

    // Student name
    const nameSize = 32
    const nameWidth = fontBold.widthOfTextAtSize(studentName, nameSize)
    page.drawText(studentName, {
      x: centerX - nameWidth / 2,
      y: pageHeight - 225,
      size: nameSize,
      font: fontBold,
      color: darkText,
    })

    // Decorative line under name
    const lineHalfWidth = Math.min(nameWidth * 0.6, 200)
    page.drawLine({
      start: { x: centerX - lineHalfWidth, y: pageHeight - 235 },
      end: { x: centerX + lineHalfWidth, y: pageHeight - 235 },
      thickness: 1.5,
      color: primaryBlue,
    })

    // Course description
    const courseLabel = 'Telah berhasil menyelesaikan kursus:'
    const courseLabelWidth = fontRegular.widthOfTextAtSize(courseLabel, 13)
    page.drawText(courseLabel, {
      x: centerX - courseLabelWidth / 2,
      y: pageHeight - 275,
      size: 13,
      font: fontRegular,
      color: grayText,
    })

    // Course title
    const courseTitleSize = 20
    const courseTitleWidth = fontBold.widthOfTextAtSize(courseTitle, courseTitleSize)
    page.drawText(courseTitle, {
      x: centerX - courseTitleWidth / 2,
      y: pageHeight - 305,
      size: courseTitleSize,
      font: fontBold,
      color: darkText,
    })

    // Completion date
    const dateLabel = `Tanggal penyelesaian: ${completionDate}`
    const dateLabelWidth = fontRegular.widthOfTextAtSize(dateLabel, 12)
    page.drawText(dateLabel, {
      x: centerX - dateLabelWidth / 2,
      y: pageHeight - 350,
      size: 12,
      font: fontRegular,
      color: grayText,
    })

    // Tenant / School name
    const tenantLabelText = tenantName
    const tenantLabelWidth = fontBold.widthOfTextAtSize(tenantLabelText, 14)
    page.drawText(tenantLabelText, {
      x: centerX - tenantLabelWidth / 2,
      y: pageHeight - 380,
      size: 14,
      font: fontBold,
      color: darkText,
    })

    // Certificate number at the bottom
    const certNumText = `No. Sertifikat: ${certificateNumber}`
    const certNumWidth = fontRegular.widthOfTextAtSize(certNumText, 9)
    page.drawText(certNumText, {
      x: centerX - certNumWidth / 2,
      y: 55,
      size: 9,
      font: fontRegular,
      color: grayText,
    })

    // Serialize PDF
    const pdfBytes = await pdfDoc.save()

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="sertifikat-${certificateNumber}.pdf"`,
      },
    })
  } catch (err) {
    console.error('generate-pdf error:', err)
    return new Response(JSON.stringify({ error: 'Gagal membuat PDF. Silakan coba lagi.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
