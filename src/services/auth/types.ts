export interface AuthUser {
  id: string
  email?: string
  phone?: string
  email_confirmed_at?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in?: number
  token_type?: string
  user: AuthUser
}

export interface AuthError {
  message: string
  name?: string
  status?: number
}

export interface AuthSubscription {
  unsubscribe(): void
}

export interface MFADetail {
  id: string
  factor_type: 'totp' | 'phone'
  status: 'verified' | 'unverified'
  friendly_name?: string
}

export interface MFAEnrollResponse {
  id: string
  totp: {
    qr_code: string
    secret: string
  }
}

export interface MFAProvider {
  enroll(config: { factorType: 'totp'; friendlyName: string }): Promise<{
    data: MFAEnrollResponse | null
    error: AuthError | null
  }>
  challenge(config: { factorId: string }): Promise<{
    data: { id: string; expires_at: number } | null
    error: AuthError | null
  }>
  verify(config: { factorId: string; code: string; challengeId?: string }): Promise<{
    data: { valid: boolean } | null
    error: AuthError | null
  }>
  challengeAndVerify(config: { factorId: string; code: string }): Promise<{
    data: { valid: boolean } | null
    error: AuthError | null
  }>
  unenroll(config: { factorId: string }): Promise<{ error: AuthError | null }>
  listFactors(): Promise<{
    data: { all: MFADetail[] } | null
    error: AuthError | null
  }>
  getAuthenticatorAssuranceLevel(): Promise<{
    data: { currentLevel: string; nextLevel: string | null; canVerifySingleFactor: boolean } | null
    error: AuthError | null
  }>
}

export interface AuthProvider {
  getSession(): Promise<{ data: { session: AuthSession | null }; error: AuthError | null }>
  getUser(): Promise<{ data: { user: AuthUser | null }; error: AuthError | null }>
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void): {
    data: { subscription: AuthSubscription }
  }
  signInWithPassword(credentials: { email: string; password: string }): Promise<{
    data: { session: AuthSession | null; user: AuthUser | null }
    error: AuthError | null
  }>
  signUp(config: {
    email: string
    password: string
    options?: {
      emailRedirectTo?: string
      data?: Record<string, unknown>
    }
  }): Promise<{
    data: { session: AuthSession | null; user: AuthUser | null }
    error: AuthError | null
  }>
  signInWithOAuth(config: {
    provider: 'google'
    options?: { redirectTo?: string }
  }): Promise<{ error: AuthError | null }>
  signOut(): Promise<{ error: AuthError | null }>
  refreshSession(): Promise<{
    data: { session: AuthSession | null }
    error: AuthError | null
  }>
  exchangeCodeForSession(code: string): Promise<{
    data: { session: AuthSession | null; user: AuthUser | null }
    error: AuthError | null
  }>
  resetPasswordForEmail(
    email: string,
    options?: { emailRedirectTo?: string }
  ): Promise<{
    error: AuthError | null
  }>
  updateUser(attributes: Record<string, unknown>): Promise<{
    data: { user: AuthUser | null }
    error: AuthError | null
  }>
  mfa: MFAProvider
}
