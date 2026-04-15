import { valibotResolver } from '@hookform/resolvers/valibot'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { useAuth } from '@/src/contexts/AuthContext'
import { apiFetch } from '@/src/lib/api'
import {
  type LoginFormData,
  LoginFormSchema,
  type RegisterFormData,
  RegisterFormSchema,
} from '@/src/shared/schemas/forms'
import { loginRateLimiter } from '@/src/utils/rateLimiter'
import { translateAuthError } from '@/src/utils/translateAuthError'

export interface InviteInfo {
  email: string
  role: string
  tenant_name: string
  tenant_id: string
}

export interface ClassInfo {
  class_id: string
  class_name: string
  teacher_name: string
  tenant_id: string
  tenant_name: string
}

export function useLoginState() {
  const { user, signIn, signUp, signInWithGoogle, loading } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loginForm = useForm<LoginFormData>({
    mode: 'onChange',
    resolver: valibotResolver(LoginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm<RegisterFormData>({
    mode: 'onChange',
    resolver: valibotResolver(RegisterFormSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  })

  // Register step 2
  const [joinCode, setJoinCode] = useState('')
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [classLookupLoading, setClassLookupLoading] = useState(false)
  const [classLookupError, setClassLookupError] = useState('')

  // Invite token from URL
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)

  useEffect(() => {
    const hash = window.location.hash
    const queryPart = hash.split('?')[1]
    if (queryPart) {
      const params = new URLSearchParams(queryPart)
      const token = params.get('invite')
      if (token) {
        setInviteToken(token)
        setMode('register')
        apiFetch('/invitations/validate', {
          method: 'POST',
          body: JSON.stringify({ token })
        }).then((data: any) => {
          if (data?.valid) {
            setInviteInfo(data as InviteInfo)
            registerForm.setValue('email', data.email)
          } else {
            setError(data?.error || 'Undangan tidak valid atau sudah kedaluwarsa.')
          }
        }).catch((err: any) => {
          setError(err?.message || 'Gagal memvalidasi undangan')
        })
      }
    }
  }, [registerForm])

  // Live class code lookup
  useEffect(() => {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) {
      setClassInfo(null)
      setClassLookupError('')
      return
    }
    const timer = setTimeout(async () => {
      setClassLookupLoading(true)
      try {
        const data = await apiFetch(`/classes/lookup?code=${code}`)
        setClassLookupLoading(false)
        if (data?.found) {
          setClassInfo(data as ClassInfo)
          setClassLookupError('')
        } else {
          setClassInfo(null)
          if (code.length >= 5) setClassLookupError(data?.error ?? 'Kode tidak ditemukan')
        }
      } catch (err: any) {
        setClassLookupLoading(false)
        setClassInfo(null)
        if (code.length >= 5) setClassLookupError(err.message || 'Kode tidak ditemukan')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [joinCode])

  const handleSignIn = async (data: LoginFormData) => {
    setError('')

    const { allowed, retryAfterMs } = loginRateLimiter.check('login')
    if (!allowed) {
      const seconds = Math.ceil(retryAfterMs / 1000)
      setError(`Terlalu banyak percobaan. Silakan coba lagi dalam ${seconds} detik.`)
      return
    }

    setSubmitting(true)
    try {
      const { error: err } = await signIn(data.email, data.password)
      if (err) setError(translateAuthError(err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegisterSubmit = async () => {
    setError('')
    setSubmitting(true)
    try {
      const data = registerForm.getValues()
      const tenantId = classInfo?.tenant_id || inviteInfo?.tenant_id
      const { error: err } = await signUp(
        data.email,
        data.password,
        data.firstName,
        data.lastName,
        tenantId
      )
      if (err) {
        setError(translateAuthError(err.message))
        return
      }

      if (joinCode.trim() && classInfo) {
        localStorage.setItem('pendingJoinCode', joinCode.trim().toUpperCase())
      }
      if (inviteToken) {
        localStorage.setItem('pendingInviteToken', inviteToken)
      }
      setStep(3)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRegisterStep1 = (_data: RegisterFormData) => {
    setError('')
    if (inviteToken) {
      handleRegisterSubmit()
    } else {
      setStep(2)
    }
  }

  const handleGoogleAuth = () => {
    signInWithGoogle()
  }

  const fillAccount = import.meta.env.DEV
    ? async (role: string) => {
        const devEmail = `${role}@edusync.dev`
        const devPassword = import.meta.env.VITE_DEV_PASSWORD
        if (!devPassword) {
          setError('VITE_DEV_PASSWORD tidak diset di .env')
          return
        }
        loginForm.reset({ email: devEmail, password: devPassword })
        setMode('login')
        setError('')
        setSubmitting(true)
        try {
          const { error: err } = await signIn(devEmail, devPassword)
          if (err) {
            setError(err.message)
          }
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : String(e))
        } finally {
          setSubmitting(false)
        }
      }
    : undefined

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setStep(1)
    setError('')
    setJoinCode('')
    setClassInfo(null)
    loginForm.reset()
    registerForm.reset()
  }

  return {
    user,
    loading,
    mode,
    step,
    setStep,
    error,
    setError,
    submitting,
    loginForm,
    registerForm,
    joinCode,
    setJoinCode,
    classInfo,
    classLookupLoading,
    classLookupError,
    inviteToken,
    inviteInfo,
    handleSignIn,
    handleRegisterStep1,
    handleRegisterSubmit,
    handleGoogleAuth,
    fillAccount,
    switchMode,
    setMode,
  }
}
