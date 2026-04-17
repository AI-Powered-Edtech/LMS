import { valibotResolver } from '@hookform/resolvers/valibot'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/features/auth/api/authService'
import { persistPostAuthRedirect } from '@/features/auth/utils/authFlow'
import {
  type LoginFormData,
  LoginFormSchema,
  type RegisterFormData,
  RegisterFormSchema,
} from '@/shared/schemas/forms'
import { loginRateLimiter } from '@/utils/rateLimiter'
import { translateAuthError } from '@/utils/translateAuthError'

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

export interface DemoAccountOption {
  key: 'student' | 'teacher' | 'admin'
  label: string
  email: string
  icon: string
}

const DEMO_HOSTNAMES = new Set([
  'edusync-lms-demo-public-baimdwipro.vercel.app',
  'dist-baimdwipro-8006s-projects.vercel.app',
])

const DEMO_ACCOUNTS: Record<DemoAccountOption['key'], DemoAccountOption> = {
  student: {
    key: 'student',
    label: 'Siswa Demo',
    email: 'siswa.andi@smanusantara.dev',
    icon: '🎓',
  },
  teacher: {
    key: 'teacher',
    label: 'Guru Demo',
    email: 'guru.matematika@smanusantara.dev',
    icon: '👩‍🏫',
  },
  admin: {
    key: 'admin',
    label: 'Admin Demo',
    email: 'admin@smanusantara.dev',
    icon: '🛡️',
  },
}

function isPublicDemoHost(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname ?? ''
  return DEMO_HOSTNAMES.has(hostname)
}

export function useLoginState(postAuthRedirect?: string | null) {
  const { user, signIn, signUp, signInWithGoogle, loading, clearAuthError } = useAuth()
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
    const params = new URLSearchParams(window.location.search)
    const token = params.get('invite')
    if (token) {
      setInviteToken(token)
      setMode('register')
      void authService.validateInvitation(token).then((data) => {
        if (data?.valid) {
          setInviteInfo(data as InviteInfo)
          registerForm.setValue('email', data.email)
        } else {
          setError(data?.error || 'Undangan tidak valid atau sudah kedaluwarsa.')
        }
      })
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
      const data = await authService.publicLookupClass(code)
      setClassLookupLoading(false)
      if (data?.found) {
        setClassInfo(data as ClassInfo)
        setClassLookupError('')
      } else {
        setClassInfo(null)
        if (code.length >= 5) setClassLookupError(data?.error ?? 'Kode tidak ditemukan')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [joinCode])

  const handleSignIn = async (data: LoginFormData) => {
    setError('')

    // Client-side rate limiting (fast, no network)
    const { allowed, retryAfterMs } = loginRateLimiter.check('login')
    if (!allowed) {
      const seconds = Math.ceil(retryAfterMs / 1000)
      setError(`Terlalu banyak percobaan. Silakan coba lagi dalam ${seconds} detik.`)
      return
    }

    // Server-side rate limiting (bypass-proof)
    const rlData = await authService.checkRateLimit('login', data.email, 10, 60_000)
    if (!rlData.allowed) {
      const seconds = Math.ceil((rlData.retryAfterMs ?? 60000) / 1000)
      setError(`Terlalu banyak percobaan login. Coba lagi dalam ${seconds} detik.`)
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
      void handleRegisterSubmit()
    } else {
      setStep(2)
    }
  }

  const handleGoogleAuth = () => {
    clearAuthError()
    persistPostAuthRedirect(postAuthRedirect)
    void signInWithGoogle()
  }

  const demoMode = import.meta.env.DEV || isPublicDemoHost()
  const demoAccounts = demoMode ? Object.values(DEMO_ACCOUNTS) : []

  const fillAccount = demoMode
    ? async (role: DemoAccountOption['key']) => {
        const devPassword = import.meta.env.VITE_DEV_PASSWORD ?? 'password123'
        const accountEmail = import.meta.env.DEV ? `${role}@edusync.dev` : DEMO_ACCOUNTS[role].email

        loginForm.reset({ email: accountEmail, password: devPassword })
        setMode('login')
        setError('')
        setSubmitting(true)
        persistPostAuthRedirect(postAuthRedirect)

        try {
          const { error: err } = await signIn(accountEmail, devPassword)
          if (err) {
            setError(translateAuthError(err.message))
          }
        } catch (e: unknown) {
          setError(translateAuthError(e instanceof Error ? e.message : String(e)))
        } finally {
          setSubmitting(false)
        }
      }
    : undefined

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setStep(1)
    setError('')
    clearAuthError()
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
    demoMode,
    demoAccounts,
    fillAccount,
    switchMode,
    setMode,
  }
}
