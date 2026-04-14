import { valibotResolver } from '@hookform/resolvers/valibot'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import * as v from 'valibot'

import { FormField } from '@/src/components/ui/FormField'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { apiFetch } from '@/src/lib/api'

const resetPasswordSchema = v.pipe(
  v.object({
    password: v.pipe(v.string(), v.minLength(6, 'Password minimal 6 karakter.')),
    confirmPassword: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirmPassword']],
      (input) => input.password === input.confirmPassword,
      'Password tidak cocok.'
    ),
    ['confirmPassword']
  )
)

type ResetPasswordFormData = v.InferInput<typeof resetPasswordSchema>

export function ResetPassword() {
  usePageTitle('Atur Ulang Kata Sandi')
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: valibotResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    // For local backend, we assume the link has a token in URL or it's handled via session
    setSessionReady(true)
  }, [])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError('')

    try {
      await apiFetch('/v1/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({ password: data.password }),
      })

      setSuccess(true)
      setTimeout(() => navigate('/'), 3000)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.')
    }
  }

  if (!sessionReady) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>⏳</span>
            <h1 style={styles.title}>Memverifikasi...</h1>
            <p style={styles.subtitle}>Menunggu verifikasi link reset password.</p>
          </div>
          <div style={styles.hint}>
            <p style={styles.hintText}>
              Jika halaman ini tidak berubah, link mungkin sudah kedaluwarsa.
            </p>
            <Link to="/forgot-password" style={styles.backLink}>
              Minta link baru →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>{success ? '✅' : '🔑'}</span>
          <h1 style={styles.title}>
            {success ? 'Password Berhasil Diubah' : 'Buat Password Baru'}
          </h1>
          <p style={styles.subtitle}>
            {success
              ? 'Anda akan dialihkan ke dashboard...'
              : 'Masukkan password baru untuk akun Anda'}
          </p>
        </div>

        {success ? (
          <div style={styles.successBox}>
            <p style={styles.successText}>
              Password telah diperbarui. Mengarahkan ke dashboard dalam 3 detik...
            </p>
            <Link to="/" style={styles.backLink}>
              Ke Dashboard →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
            <FormField control={control} name="password" label="Kata Sandi Baru">
              <input
                type="password"
                style={styles.input}
                {...register('password')}
                placeholder="Minimal 6 karakter"
                autoFocus
              />
            </FormField>

            <FormField control={control} name="confirmPassword" label="Konfirmasi Kata Sandi">
              <input
                type="password"
                style={styles.input}
                {...register('confirmPassword')}
                placeholder="Ulangi password baru"
              />
            </FormField>

            {error && <div style={styles.error}>{error}</div>}

            <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    padding: '1rem',
  },
  card: {
    background: '#1e293b',
    borderRadius: '1rem',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  logo: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  logoIcon: { fontSize: '3rem' },
  title: {
    color: '#f1f5f9',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '0.5rem 0 0.25rem',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.875rem',
    margin: 0,
    lineHeight: 1.5,
  },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '0.25rem' },
  label: { color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 500 },
  input: {
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid rgba(255,255,255,0.15)',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: '0.9rem',
    outline: 'none',
  },
  error: {
    background: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.8rem',
    border: '1px solid rgba(239,68,68,0.3)',
  },
  submitBtn: {
    padding: '0.875rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  successBox: {
    textAlign: 'center' as const,
    padding: '1.5rem',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: '0.75rem',
  },
  successText: {
    color: '#86efac',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    margin: '0 0 1rem',
  },
  hint: {
    textAlign: 'center' as const,
    padding: '1rem',
    background: 'rgba(234,179,8,0.1)',
    border: '1px solid rgba(234,179,8,0.25)',
    borderRadius: '0.5rem',
  },
  hintText: {
    color: '#fde68a',
    fontSize: '0.8rem',
    margin: '0 0 0.75rem',
    lineHeight: 1.5,
  },
  backLink: {
    display: 'block',
    textAlign: 'center' as const,
    color: '#94a3b8',
    fontSize: '0.85rem',
    textDecoration: 'none',
    marginTop: '1rem',
  },
}
