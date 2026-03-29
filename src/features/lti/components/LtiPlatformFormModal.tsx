import { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import * as v from 'valibot'

import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/src/components/ui'

import type { CreateLtiPlatformParams, LtiPlatformRegistration } from '../types'

// ── Valibot schema ─────────────────────────────────────────────
const LtiPlatformFormSchema = v.object({
  name: v.pipe(
    v.string(),
    v.nonEmpty('Nama platform wajib diisi'),
    v.maxLength(200, 'Nama platform maksimal 200 karakter')
  ),
  issuer: v.pipe(
    v.string(),
    v.nonEmpty('Issuer URL wajib diisi'),
    v.url('Issuer harus berupa URL yang valid')
  ),
  client_id: v.pipe(v.string(), v.nonEmpty('Client ID wajib diisi')),
  auth_endpoint: v.pipe(
    v.string(),
    v.nonEmpty('Auth endpoint wajib diisi'),
    v.url('Auth endpoint harus berupa URL yang valid')
  ),
  token_endpoint: v.pipe(
    v.string(),
    v.nonEmpty('Token endpoint wajib diisi'),
    v.url('Token endpoint harus berupa URL yang valid')
  ),
  jwks_url: v.pipe(
    v.string(),
    v.nonEmpty('JWKS URL wajib diisi'),
    v.url('JWKS URL harus berupa URL yang valid')
  ),
  deployment_id: v.pipe(v.string(), v.transform((s) => s || '')),
  is_active: v.boolean(),
})

type LtiPlatformFormData = v.InferOutput<typeof LtiPlatformFormSchema>

// ── Canvas / Moodle presets ────────────────────────────────────
const PRESETS: Record<string, Partial<LtiPlatformFormData>> = {
  canvas: {
    name: 'Canvas LMS',
    issuer: 'https://canvas.instructure.com',
    auth_endpoint: 'https://canvas.instructure.com/api/lti/authorize_redirect',
    token_endpoint: 'https://canvas.instructure.com/login/oauth2/token',
    jwks_url: 'https://canvas.instructure.com/api/lti/security/jwks',
  },
  moodle: {
    name: 'Moodle LMS',
    issuer: 'https://your-moodle-site.example.com',
    auth_endpoint: 'https://your-moodle-site.example.com/mod/lti/auth.php',
    token_endpoint: 'https://your-moodle-site.example.com/mod/lti/token.php',
    jwks_url: 'https://your-moodle-site.example.com/mod/lti/certs.php',
  },
}

interface LtiPlatformFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateLtiPlatformParams) => void
  isSaving: boolean
  /** Pass existing platform to edit; null for create */
  platform?: LtiPlatformRegistration | null
}

export function LtiPlatformFormModal({
  open,
  onClose,
  onSave,
  isSaving,
  platform,
}: LtiPlatformFormModalProps) {
  const isEdit = !!platform

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LtiPlatformFormData>({
    resolver: valibotResolver(LtiPlatformFormSchema),
    defaultValues: {
      name: '',
      issuer: '',
      client_id: '',
      auth_endpoint: '',
      token_endpoint: '',
      jwks_url: '',
      deployment_id: '',
      is_active: true,
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (platform) {
      reset({
        name: platform.name,
        issuer: platform.issuer,
        client_id: platform.client_id,
        auth_endpoint: platform.auth_endpoint,
        token_endpoint: platform.token_endpoint,
        jwks_url: platform.jwks_url,
        deployment_id: platform.deployment_id ?? '',
        is_active: platform.is_active,
      })
    } else {
      reset({
        name: '',
        issuer: '',
        client_id: '',
        auth_endpoint: '',
        token_endpoint: '',
        jwks_url: '',
        deployment_id: '',
        is_active: true,
      })
    }
  }, [platform, reset])

  const applyPreset = useCallback(
    (key: string) => {
      const preset = PRESETS[key]
      if (!preset) return
      for (const [field, value] of Object.entries(preset)) {
        setValue(field as keyof LtiPlatformFormData, value as string, {
          shouldValidate: false,
        })
      }
    },
    [setValue]
  )

  const onSubmit = handleSubmit((data) => {
    onSave({
      name: data.name,
      issuer: data.issuer,
      client_id: data.client_id,
      auth_endpoint: data.auth_endpoint,
      token_endpoint: data.token_endpoint,
      jwks_url: data.jwks_url,
      deployment_id: data.deployment_id || undefined,
      is_active: data.is_active,
    })
  })

  const inputClass =
    'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500'
  const labelClass = 'block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1'
  const errorClass = 'text-xs text-red-500 dark:text-red-400 mt-0.5'

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={isEdit ? 'Edit LTI Platform' : 'Tambah LTI Platform'} onClose={onClose} />
      <form onSubmit={onSubmit}>
        <ModalBody>
          <div className="space-y-4">
            {/* Presets */}
            {!isEdit && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Template:
                </span>
                <button
                  type="button"
                  onClick={() => applyPreset('canvas')}
                  className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Canvas
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('moodle')}
                  className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Moodle
                </button>
              </div>
            )}

            {/* Name */}
            <div>
              <label className={labelClass}>Nama Platform *</label>
              <input
                {...register('name')}
                className={inputClass}
                placeholder="Contoh: Canvas Production"
                autoFocus
              />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>

            {/* Issuer + Client ID row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Issuer URL *</label>
                <input
                  {...register('issuer')}
                  className={inputClass}
                  placeholder="https://canvas.instructure.com"
                />
                {errors.issuer && <p className={errorClass}>{errors.issuer.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Client ID *</label>
                <input
                  {...register('client_id')}
                  className={inputClass}
                  placeholder="10000000000001"
                />
                {errors.client_id && <p className={errorClass}>{errors.client_id.message}</p>}
              </div>
            </div>

            {/* Auth + Token endpoints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Auth Endpoint *</label>
                <input
                  {...register('auth_endpoint')}
                  className={inputClass}
                  placeholder="https://..."
                />
                {errors.auth_endpoint && (
                  <p className={errorClass}>{errors.auth_endpoint.message}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Token Endpoint *</label>
                <input
                  {...register('token_endpoint')}
                  className={inputClass}
                  placeholder="https://..."
                />
                {errors.token_endpoint && (
                  <p className={errorClass}>{errors.token_endpoint.message}</p>
                )}
              </div>
            </div>

            {/* JWKS URL */}
            <div>
              <label className={labelClass}>JWKS URL *</label>
              <input {...register('jwks_url')} className={inputClass} placeholder="https://..." />
              {errors.jwks_url && <p className={errorClass}>{errors.jwks_url.message}</p>}
            </div>

            {/* Deployment ID (optional) */}
            <div>
              <label className={labelClass}>Deployment ID (opsional)</label>
              <input
                {...register('deployment_id')}
                className={inputClass}
                placeholder="Kosongkan jika tidak diperlukan"
              />
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_active')}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Platform aktif (menerima LTI launch)
              </span>
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Menyimpan...' : isEdit ? 'Perbarui' : 'Simpan'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
