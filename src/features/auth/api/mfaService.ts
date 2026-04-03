import { supabase } from '@/services/supabase/client'
import { captureError } from '@/utils/sentry'

export interface MFAEnrollResult {
  qrCodeUrl: string
  secret: string
  factorId: string
}

export interface MFAVerifyResult {
  success: boolean
  factorId: string
}

export interface MFAFactor {
  id: string
  factor_type: 'totp' | 'phone'
  status: 'verified' | 'unverified'
  friendly_name?: string
}

export async function startMFAEnrollment(): Promise<MFAEnrollResult | null> {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    })

    if (error) throw error

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.totp.qr_code)}`

    return {
      qrCodeUrl,
      secret: data.totp.secret,
      factorId: data.id,
    }
  } catch (err) {
    captureError(err, { tags: { feature: 'mfa-enrollment' } })
    return null
  }
}

export async function verifyMFAEnrollment(
  factorId: string,
  code: string
): Promise<MFAVerifyResult | null> {
  try {
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    })

    if (error) throw error

    return {
      success: true,
      factorId,
    }
  } catch (err) {
    captureError(err, { tags: { feature: 'mfa-verify' } })
    return null
  }
}

export async function verifyMFAChallenge(factorId: string, code: string): Promise<boolean> {
  try {
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    })

    if (error) throw error
    return true
  } catch (err) {
    captureError(err, { tags: { feature: 'mfa-login-verify' } })
    return false
  }
}

export async function listMFAFactors(): Promise<MFAFactor[]> {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error
    // Filter to only totp/phone factor types supported by our MFAFactor interface
    return (data?.all ?? []).filter(
      (f): f is typeof f & { factor_type: 'totp' | 'phone' } =>
        f.factor_type === 'totp' || f.factor_type === 'phone'
    ) as MFAFactor[]
  } catch (err) {
    captureError(err, { tags: { feature: 'mfa-list-factors' } })
    return []
  }
}

export async function unenrollMFA(factorId: string): Promise<boolean> {
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw error
    return true
  } catch (err) {
    captureError(err, { tags: { feature: 'mfa-unenroll' } })
    return false
  }
}
