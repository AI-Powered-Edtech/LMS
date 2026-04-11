import { db } from '@/services/db'

import type {
  CreateLtiPlatformParams,
  LtiPlatformRegistration,
  UpdateLtiPlatformParams,
} from '../types'

const COLUMNS =
  'id, tenant_id, name, issuer, client_id, auth_endpoint, token_endpoint, jwks_url, deployment_id, is_active, created_at'

/**
 * Service layer for LTI platform registration CRUD operations.
 * All Supabase calls for the LTI feature go through here.
 */
export const ltiService = {
  /** Fetch all LTI platform registrations for the current tenant */
  async fetchPlatforms(tenantId: string): Promise<LtiPlatformRegistration[]> {
    const { data, error } = await db
      .from('lti_platform_registrations')
      .select(COLUMNS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as LtiPlatformRegistration[]
  },

  /** Fetch a single LTI platform registration */
  async fetchPlatform(id: string, tenantId: string): Promise<LtiPlatformRegistration | null> {
    const { data, error } = await db
      .from('lti_platform_registrations')
      .select(COLUMNS)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) throw error
    return data as LtiPlatformRegistration | null
  },

  /** Create a new LTI platform registration */
  async createPlatform(params: CreateLtiPlatformParams): Promise<LtiPlatformRegistration> {
    const { data, error } = await db
      .from('lti_platform_registrations')
      .insert({
        name: params.name,
        issuer: params.issuer,
        client_id: params.client_id,
        auth_endpoint: params.auth_endpoint,
        token_endpoint: params.token_endpoint,
        jwks_url: params.jwks_url,
        deployment_id: params.deployment_id || null,
        is_active: params.is_active ?? true,
      })
      .select(COLUMNS)
      .single()

    if (error) throw error
    return data as LtiPlatformRegistration
  },

  /** Update an existing LTI platform registration */
  async updatePlatform(
    params: UpdateLtiPlatformParams,
    tenantId: string
  ): Promise<LtiPlatformRegistration> {
    const { id, ...updates } = params
    const { data, error } = await db
      .from('lti_platform_registrations')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(COLUMNS)
      .single()

    if (error) throw error
    return data as LtiPlatformRegistration
  },

  /** Delete an LTI platform registration */
  async deletePlatform(id: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from('lti_platform_registrations')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw error
  },

  /** Toggle is_active flag */
  async togglePlatform(id: string, isActive: boolean, tenantId: string): Promise<void> {
    const { error } = await db
      .from('lti_platform_registrations')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) throw error
  },
}
