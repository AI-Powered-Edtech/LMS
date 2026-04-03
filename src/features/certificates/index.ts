/**
 * Certificate Templates Feature Module
 * Phase 36C — Certificate Template Customization
 *
 * Public API for the certificates feature.
 */

// Components
export { CertificateTemplateEditor } from './components/CertificateTemplateEditor'
export { CertificateTemplateList } from './components/CertificateTemplateList'
export { CertificateTemplatePreview } from './components/CertificateTemplatePreview'

// Query keys
export { certTemplateKeys } from './queries/certificateTemplateKeys'

// Query hooks
export {
  useCertificateTemplateByCourse,
  useCertificateTemplates,
  useDeleteCertificateTemplate,
  useSaveCertificateTemplate,
  useSetDefaultTemplate,
} from './queries/certificateTemplateQueries'

// Service
export { certificateTemplateService } from './api/certificateTemplateService'

// Types
export type { CertificateTemplate, CertificateTemplateInsert } from './types'
export { DEFAULT_TEMPLATE } from './types'
