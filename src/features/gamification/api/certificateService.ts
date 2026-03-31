import { supabase } from '@/services/supabase/client'

export interface CertificatePdfParams {
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
    const { data, error } = await supabase.functions.invoke('generate-pdf', {
      body: {
        type: 'certificate',
        data: params,
      },
    })

    if (error) throw error

    return data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' })
  },
}
