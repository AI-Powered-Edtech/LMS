import { supabase } from '@/services/supabase/client'

interface CertificatePdfParams {
  studentName: string
  courseTitle: string
  completionDate: string
  tenantName: string
  certificateNumber: string
}

/**
 * Certificate Service
 * Wraps the generate-pdf Edge Function for certificate PDF generation.
 */
export const certificateService = {
  /**
   * Generate a certificate PDF via the generate-pdf Edge Function.
   * Returns a Blob containing the PDF data.
   */
  async generatePdf(params: CertificatePdfParams): Promise<Blob> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: {
          type: 'certificate',
          data: params,
        },
      })

      if (error) {
        const msg = error.message ?? ''
        const edgeError = error as { code?: string }
        if (
          msg.includes('not found') ||
          msg.includes('404') ||
          edgeError.code === 'PGRST202'
        ) {
          throw new Error('Layanan pembuatan sertifikat sedang tidak tersedia. Coba lagi nanti.')
        }
        throw error
      }

      return data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' })
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string }
      if (
        error.message?.includes('not found') ||
        error.code === 'PGRST202' ||
        error.message?.includes('404')
      ) {
        throw new Error('Layanan pembuatan sertifikat sedang tidak tersedia. Coba lagi nanti.')
      }
      throw err
    }
  },
}
