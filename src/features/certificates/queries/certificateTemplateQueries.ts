import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { GC, STALE } from "@/utils/queryConstants";
import { captureError } from "@/utils/sentry";

import { certificateTemplateService } from "../api/certificateTemplateService";
import type { CertificateTemplateInsert } from "../types";
import { certTemplateKeys } from "./certificateTemplateKeys";

// ── List all templates ─────────────────────────────────────────

/**
 * Fetch all certificate templates for the current tenant.
 */
export function useCertificateTemplates(tenantId?: string) {
  const { tenantId: authTenantId } = useAuth();
  const tid = tenantId ?? authTenantId;

  return useQuery({
    queryKey: certTemplateKeys.lists(tid!),
    queryFn: () => certificateTemplateService.getTemplates(tid!),
    enabled: !!tid,
    staleTime: STALE.MODERATE,
    gcTime: GC.NORMAL,
  });
}

// ── Template by course ─────────────────────────────────────────

/**
 * Fetch the template assigned to a course (or the tenant default).
 */
export function useCertificateTemplateByCourse(courseId: string | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: [...certTemplateKeys.detail(tenantId!, courseId ?? "default")],
    queryFn: () =>
      certificateTemplateService.getTemplateByCourse(courseId!, tenantId!),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.MODERATE,
    gcTime: GC.NORMAL,
  });
}

// ── Save (create/update) template ─────────────────────────────

/**
 * Mutation to create or update a certificate template.
 */
export function useSaveCertificateTemplate() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: (template: CertificateTemplateInsert & { id?: string }) =>
      certificateTemplateService.saveTemplate(template, tenantId!),
    onSuccess: () => {
      if (tenantId) {
        void qc.invalidateQueries({ queryKey: certTemplateKeys.all(tenantId) });
      }
    },
    onError: (err) =>
      captureError(err, { context: "useSaveCertificateTemplate" }),
  });
}

// ── Set default template ───────────────────────────────────────

/**
 * Mutation to mark a template as the tenant default.
 */
export function useSetDefaultTemplate() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: (templateId: string) =>
      certificateTemplateService.setDefault(templateId, tenantId!),
    onSuccess: () => {
      if (tenantId) {
        void qc.invalidateQueries({ queryKey: certTemplateKeys.all(tenantId) });
      }
    },
    onError: (err) => captureError(err, { context: "useSetDefaultTemplate" }),
  });
}

// ── Delete template ────────────────────────────────────────────

/**
 * Mutation to delete a certificate template.
 */
export function useDeleteCertificateTemplate() {
  const qc = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: (templateId: string) =>
      certificateTemplateService.deleteTemplate(templateId, tenantId!),
    onSuccess: () => {
      if (tenantId) {
        void qc.invalidateQueries({ queryKey: certTemplateKeys.all(tenantId) });
      }
    },
    onError: (err) =>
      captureError(err, { context: "useDeleteCertificateTemplate" }),
  });
}
