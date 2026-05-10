/** LTI feature types */

export interface LtiPlatformRegistration {
  id: string;
  tenant_id: string;
  name: string;
  issuer: string;
  client_id: string;
  auth_endpoint: string;
  token_endpoint: string;
  jwks_url: string;
  deployment_id: string | null;
  is_active: boolean;
  /** Phase 35C: AGS lineitem URL for grade passback */
  ags_lineitem_url: string | null;
  /** Phase 35C: AGS scope string */
  ags_scope: string | null;
  created_at: string;
}

export interface CreateLtiPlatformParams {
  name: string;
  issuer: string;
  client_id: string;
  auth_endpoint: string;
  token_endpoint: string;
  jwks_url: string;
  deployment_id?: string;
  is_active?: boolean;
  ags_lineitem_url?: string;
  ags_scope?: string;
}

export interface UpdateLtiPlatformParams extends Partial<CreateLtiPlatformParams> {
  id: string;
}

/** Phase 35C: Grade passback log entry */
export interface LtiGradePassbackLog {
  id: string;
  platform_id: string | null;
  user_id: string;
  resource_type: "quiz" | "assignment";
  resource_id: string;
  score_sent: number | null;
  max_score: number | null;
  status: "pending" | "success" | "failed";
  error_message: string | null;
  tenant_id: string;
  created_at: string;
}
