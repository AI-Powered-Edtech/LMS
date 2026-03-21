import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { passwordResetRateLimiter } from '@/src/utils/rateLimiter'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { allowed, retryAfterMs } = passwordResetRateLimiter.check('password-reset')
    if (!allowed) {
      const seconds = Math.ceil(retryAfterMs / 1000)
      setError(`Terlalu banyak percobaan. Silakan coba lagi dalam ${seconds} detik.`)
      return
    }

    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setSubmitted(true)
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🔐</span>
          <h1 style={styles.title}>Reset Password</h1>
          <p style={styles.subtitle}>
            {submitted
              ? 'Cek email kamu untuk link reset password'
              : 'Masukkan email untuk menerima link reset password'}
          </p>
        </div>

        {submitted ? (
          <div style={styles.successBox}>
            <p style={styles.successIcon}>✉️</p>
            <p style={styles.successText}>
              Email reset password telah dikirim ke <strong>{email}</strong>. Silakan cek inbox atau
              folder spam.
            </p>
            <p style={styles.successHint}>Link akan kedaluwarsa dalam 1 jam.</p>
            <Link to="/login" style={styles.backLink}>
              ← Kembali ke Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>

            <Link to="/login" style={styles.backLink}>
              ← Kembali ke Login
            </Link>
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
  successIcon: { fontSize: '2.5rem', margin: '0 0 0.75rem' },
  successText: {
    color: '#86efac',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    margin: '0 0 0.5rem',
  },
  successHint: {
    color: '#64748b',
    fontSize: '0.75rem',
    margin: '0 0 1rem',
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
