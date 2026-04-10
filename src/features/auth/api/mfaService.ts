import QRCode from 'qrcode'

import { getAuthProvider } from '@/services/auth'
import { captureError } from '@/utils/sentry'

export interface MFAEnrollResult {
  /** data:image/png;base64,... — generated entirely client-side, no external service */
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
    const { data, error } = await getAuthProvider().mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    })

    if (error || !data) throw error || new Error('MFA enrollment failed')

    // SECURITY: Generate QR code entirely in the browser using the 'qrcode' library.
    // The TOTP secret NEVER leaves the browser — no external service is called.
    // Previously this used https://api.qrserver.com which exposed the secret to a third party.
    const qrCodeUrl = await QRCode.toDataURL(data.totp.qr_code, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })

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
    const { error } = await getAuthProvider().mfa.challengeAndVerify({
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
    const { error } = await getAuthProvider().mfa.challengeAndVerify({
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
    const { data, error } = await getAuthProvider().mfa.listFactors()
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
    const { error } = await getAuthProvider().mfa.unenroll({ factorId })
    if (error) throw error
    return true
  } catch (err) {
    captureError(err, { tags: { feature: 'mfa-unenroll' } })
    return false
  }
}
