import React, { useState } from 'react'

import { usePageTitle } from '@/src/hooks/usePageTitle'
import { apiFetch } from '@/src/lib/api'

import { useAuth } from '../contexts/AuthContext'

export function VerifyEmail() {
  usePageTitle('Verifikasi Email')
  const { user, signOut } = useAuth()
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  const handleResend = async () => {
    setError('')
    setResending(true)

    try {
      await apiFetch('/v1/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: user?.email ?? '' }),
      })

      setResent(true)
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim ulang email verifikasi.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📧</span>
          <h1 style={styles.title}>Verifikasi Email</h1>
          <p style={styles.subtitle}>Kami telah mengirim email verifikasi ke</p>
          <p style={styles.email}>{user?.email ?? 'your@email.com'}</p>
        </div>

        <div style={styles.instructions}>
          <div style={styles.step}>
            <span style={styles.stepNum}>1</span>
            <p style={styles.stepText}>Buka inbox email kamu</p>
          </div>
          <div style={styles.step}>
            <span style={styles.stepNum}>2</span>
            <p style={styles.stepText}>Klik link "Confirm your mail"</p>
          </div>
          <div style={styles.step}>
            <span style={styles.stepNum}>3</span>
            <p style={styles.stepText}>Kembali ke halaman ini dan refresh</p>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {resent ? (
          <div style={styles.success}>✅ Email verifikasi telah dikirim ulang!</div>
        ) : (
          <button style={styles.resendBtn} onClick={handleResend} disabled={resending}>
            {resending ? 'Mengirim...' : '📤 Kirim Ulang Email Verifikasi'}
          </button>
        )}

        <div style={styles.actions}>
          <button style={styles.refreshBtn} onClick={() => window.location.reload()}>
            🔄 Refresh Halaman
          </button>

          <button style={styles.logoutBtn} onClick={signOut}>
            Logout & Gunakan Email Lain
          </button>
        </div>

        <p style={styles.hint}>Cek folder spam jika tidak menemukan email.</p>
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
    maxWidth: '440px',
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
    margin: '0.5rem 0 0.5rem',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.875rem',
    margin: 0,
  },
  email: {
    color: '#60a5fa',
    fontSize: '0.95rem',
    fontWeight: 600,
    margin: '0.25rem 0 0',
  },
  instructions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    marginBottom: '1.5rem',
    padding: '1.25rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '0.75rem',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  stepNum: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  stepText: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
    margin: 0,
  },
  error: {
    background: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.8rem',
    border: '1px solid rgba(239,68,68,0.3)',
    marginBottom: '1rem',
    textAlign: 'center' as const,
  },
  success: {
    background: 'rgba(34,197,94,0.1)',
    color: '#86efac',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.85rem',
    border: '1px solid rgba(34,197,94,0.25)',
    marginBottom: '1rem',
    textAlign: 'center' as const,
  },
  resendBtn: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  refreshBtn: {
    width: '100%',
    padding: '0.875rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  logoutBtn: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1px solid rgba(239,68,68,0.3)',
    background: 'transparent',
    color: '#fca5a5',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  hint: {
    color: '#64748b',
    fontSize: '0.7rem',
    textAlign: 'center' as const,
    marginTop: '1rem',
  },
}
