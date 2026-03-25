import { valibotResolver } from '@hookform/resolvers/valibot'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as v from 'valibot'

import { supabase } from '@/src/services/supabase/client'

import { useAuth } from '../../contexts/AuthContext'
import { FormField } from '../ui/FormField'

const InviteUserSchema = v.object({
  email: v.pipe(v.string(), v.email('Email tidak valid')),
  role: v.picklist(['STUDENT', 'TEACHER', 'ADMIN']),
})
type InviteUserData = v.InferOutput<typeof InviteUserSchema>
type InviteRole = InviteUserData['role']

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
  const { user, tenantId, activeTenant } = useAuth()
  const { control, handleSubmit, reset, watch, setValue } = useForm<InviteUserData>({
    resolver: valibotResolver(InviteUserSchema),
    defaultValues: { email: '', role: 'STUDENT' },
  })

  const email = watch('email')
  const role = watch('role')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')

  if (!isOpen) return null

  const onSubmit = async (data: InviteUserData) => {
    setError('')
    setInviteLink('')
    setLoading(true)

    try {
      if (!tenantId || !user) {
        setError('Tenant atau user tidak ditemukan.')
        return
      }

      const { data: insertData, error: insertError } = await supabase
        .from('tenant_invitations')
        .insert({
          tenant_id: tenantId,
          email: data.email.toLowerCase().trim(),
          role: data.role,
          invited_by: user.id,
        })
        .select('token')
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Email ini sudah diundang dan masih pending.')
        } else {
          setError(insertError.message)
        }
        return
      }

      const link = `${window.location.origin}/#/login?invite=${insertData.token}`
      setInviteLink(link)
      reset({ email: data.email, role: data.role })
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim undangan.')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink)
  }

  const handleClose = () => {
    reset({ email: '', role: 'STUDENT' })
    setError('')
    setInviteLink('')
    onClose()
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>📨 Undang Pengguna Baru</h2>
          <p style={styles.subtitle}>
            Ke <strong>{activeTenant?.name ?? 'tenant'}</strong>
          </p>
          <button style={styles.closeBtn} onClick={handleClose} aria-label="Tutup modal">
            ✕
          </button>
        </div>

        {inviteLink ? (
          <div style={styles.successSection}>
            <p style={styles.successIcon}>✅</p>
            <p style={styles.successText}>
              Undangan berhasil dibuat untuk <strong>{email}</strong> sebagai{' '}
              <strong>{role}</strong>
            </p>
            <p style={styles.linkLabel}>Link Pendaftaran:</p>
            <div style={styles.linkBox}>
              <code style={styles.linkCode}>{inviteLink}</code>
              <button style={styles.copyBtn} onClick={copyLink}>
                📋 Copy
              </button>
            </div>
            <p style={styles.linkHint}>Kirimkan link ini ke pengguna. Berlaku selama 7 hari.</p>
            <button style={styles.doneBtn} onClick={handleClose}>
              Selesai
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
            <div style={styles.field}>
              <FormField
                control={control}
                name="email"
                label="Email"
                labelClassName="text-slate-300"
              >
                <input type="email" style={styles.input} placeholder="user@example.com" autoFocus />
              </FormField>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Peran</label>
              <div style={styles.roleGrid}>
                {(['STUDENT', 'TEACHER', 'ADMIN'] as InviteRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    style={role === r ? styles.roleActive : styles.roleBtn}
                    onClick={() => setValue('role', r)}
                  >
                    {r === 'STUDENT' && '🎓 '}
                    {r === 'TEACHER' && '👩‍🏫 '}
                    {r === 'ADMIN' && '🛡️ '}
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Membuat undangan...' : 'Buat Undangan'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  },
  modal: {
    background: '#1e293b',
    borderRadius: '1rem',
    padding: '2rem',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    position: 'relative',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '1.25rem',
    fontWeight: 700,
    margin: '0 0 0.25rem',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    margin: 0,
  },
  closeBtn: {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.25rem',
    cursor: 'pointer',
  },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '1.25rem' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '0.375rem' },
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
  roleGrid: {
    display: 'flex',
    gap: '0.5rem',
  },
  roleBtn: {
    flex: 1,
    padding: '0.625rem',
    borderRadius: '0.5rem',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.03)',
    color: '#94a3b8',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: 500,
  },
  roleActive: {
    flex: 1,
    padding: '0.625rem',
    borderRadius: '0.5rem',
    border: '1px solid #3b82f6',
    background: 'rgba(59,130,246,0.15)',
    color: '#60a5fa',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontWeight: 600,
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
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  successSection: {
    textAlign: 'center' as const,
  },
  successIcon: { fontSize: '2.5rem', margin: '0 0 0.75rem' },
  successText: {
    color: '#86efac',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    margin: '0 0 1.25rem',
  },
  linkLabel: {
    color: '#94a3b8',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 0.5rem',
    textAlign: 'left' as const,
  },
  linkBox: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  linkCode: {
    flex: 1,
    padding: '0.625rem',
    background: '#0f172a',
    borderRadius: '0.375rem',
    color: '#60a5fa',
    fontSize: '0.7rem',
    overflowX: 'auto' as const,
    whiteSpace: 'nowrap' as const,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  copyBtn: {
    padding: '0.625rem 0.75rem',
    borderRadius: '0.375rem',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#cbd5e1',
    fontSize: '0.8rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  linkHint: {
    color: '#64748b',
    fontSize: '0.7rem',
    margin: '0 0 1.25rem',
    textAlign: 'left' as const,
  },
  doneBtn: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
}
