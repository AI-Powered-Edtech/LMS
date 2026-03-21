import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Supabase auto-logs the user in when they click the recovery link.
    // We listen for the PASSWORD_RECOVERY event to know we're ready.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if user already has an active session (e.g., page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Password tidak cocok.')
      return
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        setTimeout(() => navigate('/'), 3000)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
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
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Password Baru</label>
              <input
                type="password"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
                autoFocus
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Konfirmasi Password</label>
              <input
                type="password"
                style={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                required
                minLength={6}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
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
