/** LTI feature types */

export interface LtiPlatformRegistration {
  id: string
  tenant_id: string
  name: string
  issuer: string
  client_id: string
  auth_endpoint: string
  token_endpoint: string
  jwks_url: string
  deployment_id: string | null
  is_active: boolean
  created_at: string
}

export interface CreateLtiPlatformParams {
  name: string
  issuer: string
  client_id: string
  auth_endpoint: string
  token_endpoint: string
  jwks_url: string
  deployment_id?: string
  is_active?: boolean
}

export interface UpdateLtiPlatformParams extends Partial<CreateLtiPlatformParams> {
  id: string
}
