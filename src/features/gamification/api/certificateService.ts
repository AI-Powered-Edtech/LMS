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
        if (
          msg.includes('not found') ||
          msg.includes('404') ||
          (error as any).code === 'PGRST202'
        ) {
          throw new Error('Layanan pembuatan sertifikat sedang tidak tersedia. Coba lagi nanti.')
        }
        throw error
      }

      return data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' })
    } catch (err: any) {
      if (
        err.message?.includes('not found') ||
        err.code === 'PGRST202' ||
        err.message?.includes('404')
      ) {
        throw new Error('Layanan pembuatan sertifikat sedang tidak tersedia. Coba lagi nanti.')
      }
      throw err
    }
  },
}
