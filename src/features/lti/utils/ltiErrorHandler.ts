/**
 * LTI Error Handler Utilities
 *
 * Provides comprehensive error handling for LTI 1.3 integration flows
 * including expired tokens, malformed launches, and platform-specific quirks.
 */

/**
 * LTI Error Codes
 */
export type LTLErrorCode =
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'MISSING_CLAIMS'
  | 'INVALID_SIGNATURE'
  | 'MALFORMED_LAUNCH'
  | 'PLATFORM_NOT_FOUND'
  | 'DEPLOYMENT_MISMATCH'
  | 'USER_PROVISIONING_FAILED'
  | 'TENANT_MISMATCH'
  | 'TIMESTAMP_EXPIRED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * LTI Error Interface
 */
export interface LTLError {
  code: LTLErrorCode
  message: string
  details?: Record<string, unknown>
  retryable: boolean
}

/**
 * Classify LTI error from raw error object
 */
export function classifyLTLError(error: unknown): LTLError {
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Terjadi kesalahan yang tidak diketahui',
      retryable: false,
    }
  }

  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorObj = error as Record<string, unknown>

  // Token expired
  if (
    errorMessage.includes('token expired') ||
    errorMessage.includes('exp') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('kadaluarsa')
  ) {
    return {
      code: 'TOKEN_EXPIRED',
      message: 'Token LTI telah kadaluarsa. Silakan mulai ulang dari platform LMS Anda.',
      details: { originalError: errorMessage },
      retryable: true,
    }
  }

  // Invalid token
  if (
    errorMessage.includes('invalid token') ||
    errorMessage.includes('token invalid') ||
    errorMessage.includes('jwt')
  ) {
    return {
      code: 'TOKEN_INVALID',
      message: 'Token LTI tidak valid. Hubungi administrator platform.',
      details: { originalError: errorMessage },
      retryable: false,
    }
  }

  // Missing claims
  if (
    errorMessage.includes('missing claim') ||
    errorMessage.includes('missing_claims') ||
    errorMessage.includes('required claim')
  ) {
    return {
      code: 'MISSING_CLAIMS',
      message: 'Token LTI tidak lengkap. Hubungi administrator platform.',
      details: { originalError: errorMessage },
      retryable: false,
    }
  }

  // Invalid signature
  if (
    errorMessage.includes('signature') ||
    errorMessage.includes('jwks') ||
    errorMessage.includes('verification failed')
  ) {
    return {
      code: 'INVALID_SIGNATURE',
      message: 'Verifikasi tanda tangan LTI gagal. Periksa konfigurasi JWKS.',
      details: { originalError: errorMessage },
      retryable: false,
    }
  }

  // Malformed launch
  if (
    errorMessage.includes('malformed') ||
    errorMessage.includes('invalid launch') ||
    errorMessage.includes('launch_error')
  ) {
    return {
      code: 'MALFORMED_LAUNCH',
      message: 'Peluncuran LTI tidak valid. Coba lagi dari platform Anda.',
      details: { originalError: errorMessage },
      retryable: true,
    }
  }

  // Platform not found
  if (
    errorMessage.includes('platform not found') ||
    errorMessage.includes('PLATFORM_NOT_FOUND') ||
    errorMessage.includes('unknown issuer')
  ) {
    return {
      code: 'PLATFORM_NOT_FOUND',
      message: 'Platform LTI tidak terdaftar. Hubungi administrator.',
      details: { originalError: errorMessage },
      retryable: false,
    }
  }

  // Deployment mismatch
  if (
    errorMessage.includes('deployment') ||
    errorMessage.includes('DEPLOYMENT_MISMATCH')
  ) {
    return {
      code: 'DEPLOYMENT_MISMATCH',
      message: 'Deployment ID tidak cocok. Periksa konfigurasi LTI.',
      details: { originalError: errorMessage },
      retryable: false,
    }
  }

  // User provisioning failed
  if (
    errorMessage.includes('provisioning') ||
    errorMessage.includes('USER_PROVISIONING')
  ) {
    return {
      code: 'USER_PROVISIONING_FAILED',
      message: 'Gagal membuat akun pengguna. Hubungi administrator.',
      details: { originalError: errorMessage },
      retryable: true,
    }
  }

  // Network errors
  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('Failed to fetch')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Koneksi jaringan gagal. Periksa internet Anda.',
      details: { originalError: errorMessage },
      retryable: true,
    }
  }

  // Default
  return {
    code: 'UNKNOWN_ERROR',
    message: 'Terjadi kesalahan pada integrasi LTI. Silakan coba lagi.',
    details: { originalError: errorMessage },
    retryable: errorObj?.retryable as boolean | undefined ?? true,
  }
}

/**
 * Get user-friendly message for LTI error
 */
export function getLTLErrorUserMessage(error: LTLError): string {
  return error.message
}

/**
 * Check if LTI error should be logged to diagnostics
 */
export function shouldLogLTLError(error: LTLError): boolean {
  // Always log non-retryable errors
  if (!error.retryable) return true

  // Log retryable errors with specific codes
  const loggableCodes: LTLErrorCode[] = [
    'INVALID_SIGNATURE',
    'PLATFORM_NOT_FOUND',
    'USER_PROVISIONING_FAILED',
  ]

  return loggableCodes.includes(error.code)
}

/**
 * Create LTI error from code and details
 */
export function createLTLError(
  code: LTLErrorCode,
  details?: Record<string, unknown>
): LTLError {
  const messages: Record<LTLErrorCode, string> = {
    TOKEN_EXPIRED: 'Token LTI telah kadaluarsa. Silakan mulai ulang dari platform LMS Anda.',
    TOKEN_INVALID: 'Token LTI tidak valid. Hubungi administrator platform.',
    MISSING_CLAIMS: 'Token LTI tidak lengkap. Hubungi administrator platform.',
    INVALID_SIGNATURE: 'Verifikasi tanda tangan LTI gagal. Periksa konfigurasi JWKS.',
    MALFORMED_LAUNCH: 'Peluncuran LTI tidak valid. Coba lagi dari platform Anda.',
    PLATFORM_NOT_FOUND: 'Platform LTI tidak terdaftar. Hubungi administrator.',
    DEPLOYMENT_MISMATCH: 'Deployment ID tidak cocok. Periksa konfigurasi LTI.',
    USER_PROVISIONING_FAILED: 'Gagal membuat akun pengguna. Hubungi administrator.',
    TENANT_MISMATCH: 'Tenant tidak cocok. Hubungi administrator.',
    TIMESTAMP_EXPIRED: 'Timestamp LTI telah kadaluarsa. Coba lagi.',
    NETWORK_ERROR: 'Koneksi jaringan gagal. Periksa internet Anda.',
    UNKNOWN_ERROR: 'Terjadi kesalahan pada integrasi LTI. Silakan coba lagi.',
  }

  return {
    code,
    message: messages[code],
    details,
    retryable: !['TOKEN_INVALID', 'MISSING_CLAIMS', 'INVALID_SIGNATURE', 'PLATFORM_NOT_FOUND', 'DEPLOYMENT_MISMATCH', 'TENANT_MISMATCH'].includes(code),
  }
}
