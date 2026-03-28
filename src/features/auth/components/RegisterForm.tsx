import React from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { FormField } from '@/src/components/ui/FormField'
import type { ClassInfo, InviteInfo } from '@/src/features/auth/hooks/useLoginState'
import type { RegisterFormData } from '@/src/shared/schemas/forms'

interface RegisterStep1Props {
  registerForm: UseFormReturn<RegisterFormData>
  error: string
  submitting: boolean
  inviteToken: string | null
  inviteInfo: InviteInfo | null
  onSubmit: (data: RegisterFormData) => void
}

export function RegisterStep1({
  registerForm,
  error,
  submitting,
  inviteToken,
  inviteInfo,
  onSubmit,
}: RegisterStep1Props) {
  return (
    <form onSubmit={registerForm.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField
          name="firstName"
          control={registerForm.control}
          label="Nama Depan"
          labelClassName="text-white/60 text-xs font-medium mb-1.5"
        >
          <input
            placeholder="Budi"
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
          />
        </FormField>
        <FormField
          name="lastName"
          control={registerForm.control}
          label="Nama Belakang"
          labelClassName="text-white/60 text-xs font-medium mb-1.5"
        >
          <input
            placeholder="Santoso"
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
          />
        </FormField>
      </div>
      <FormField
        name="email"
        control={registerForm.control}
        label="Email"
        labelClassName="text-white/60 text-xs font-medium mb-1.5"
      >
        <input
          type="email"
          placeholder="kamu@email.com"
          readOnly={!!inviteInfo}
          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm disabled:opacity-60"
        />
      </FormField>
      <FormField
        name="password"
        control={registerForm.control}
        label="Kata Sandi"
        labelClassName="text-white/60 text-xs font-medium mb-1.5"
      >
        <input
          type="password"
          placeholder="Min 8 karakter, 1 Huruf Besar, 1 Angka"
          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm"
        />
      </FormField>
      {error && (
        <p
          role="alert"
          className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors mt-2"
      >
        {inviteToken ? (submitting ? 'Membuat Akun...' : 'Buat Akun & Bergabung') : 'Lanjut →'}
      </button>
    </form>
  )
}

interface RegisterStep2Props {
  joinCode: string
  setJoinCode: (value: string) => void
  classInfo: ClassInfo | null
  classLookupLoading: boolean
  classLookupError: string
  error: string
  submitting: boolean
  onBack: () => void
  onSubmit: () => void
}

export function RegisterStep2({
  joinCode,
  setJoinCode,
  classInfo,
  classLookupLoading,
  classLookupError,
  error,
  submitting,
  onBack,
  onSubmit,
}: RegisterStep2Props) {
  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="reg-join-code" className="block text-white/60 text-xs font-medium mb-1.5">
          Kode Kelas dari Guru / Tutor
        </label>
        <input
          id="reg-join-code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Contoh: ABC123"
          maxLength={10}
          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-white/20 text-sm tracking-widest font-mono uppercase"
        />
        {classLookupLoading && (
          <p className="text-white/40 text-xs mt-2 flex items-center gap-1">
            <span className="inline-block w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            Mencari kelas...
          </p>
        )}
        {classInfo && (
          <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-green-300 text-xs font-semibold">Kelas ditemukan</p>
            <p className="text-white/80 text-sm font-medium mt-0.5">{classInfo.class_name}</p>
            <p className="text-white/40 text-xs">
              {classInfo.teacher_name} · {classInfo.tenant_name}
            </p>
          </div>
        )}
        {classLookupError && joinCode.length >= 5 && (
          <p className="text-red-400 text-xs mt-2">{classLookupError}</p>
        )}
      </div>

      <p className="text-white/30 text-xs text-center">
        Minta kode kelas dari guru atau tutor kamu. Jika belum punya, lewati langkah ini.
      </p>

      {error && (
        <p
          role="alert"
          className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl py-3 font-semibold transition-colors text-sm"
        >
          Kembali
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors text-sm"
        >
          {submitting ? 'Membuat...' : classInfo ? 'Daftar & Bergabung' : 'Lewati & Daftar'}
        </button>
      </div>
    </div>
  )
}
