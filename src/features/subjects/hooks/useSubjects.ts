import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import {
  type CurriculumItem,
  type Subject,
  subjectService,
} from "@/features/subjects/api/subjectService";
import { createQueryKeys } from "@/lib/queryKeys";

const subjectKeys = createQueryKeys("subjects");
const ciKeys = createQueryKeys("curriculum_items");

export function useSubjects() {
  const { tenantId } = useAuth();
  return useQuery<Subject[]>({
    queryKey: [...subjectKeys.all(tenantId!)],
    queryFn: () => subjectService.list(tenantId!),
    enabled: !!tenantId,
  });
}

export function useCurriculumItems(subjectId: string | null) {
  const { tenantId } = useAuth();
  return useQuery<CurriculumItem[]>({
    queryKey: [...ciKeys.all(tenantId!), subjectId],
    queryFn: () =>
      subjectId
        ? subjectService.listCurriculumItems(tenantId!, subjectId)
        : Promise.resolve([]),
    enabled: !!tenantId && !!subjectId,
  });
}

export function useCreateSubject() {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      code: string;
      name: string;
      schoolBand: "SD" | "SMP" | "SMA";
      phase: Subject["is_kurmer_phase"];
      description?: string;
    }) =>
      subjectService.create({
        tenant_id: tenantId!,
        code: input.code,
        name: input.name,
        school_band: input.schoolBand,
        is_kurmer_phase: input.phase,
        description: input.description ?? null,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: subjectKeys.all(tenantId!) }),
  });
}

export function useCreateCurriculumItem() {
  const { tenantId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      subjectId: string;
      gradeLevelId: string | null;
      parentId: string | null;
      code: string;
      itemType: "CP" | "ATP" | "TP";
      title: string;
      description?: string;
      sortOrder: number;
    }) =>
      subjectService.createCurriculumItem({
        tenant_id: tenantId!,
        subject_id: input.subjectId,
        grade_level_id: input.gradeLevelId,
        parent_id: input.parentId,
        code: input.code,
        item_type: input.itemType,
        title: input.title,
        description: input.description ?? null,
        sort_order: input.sortOrder,
      }),
    onSuccess: (_, _vars) =>
      qc
        .invalidateQueries({ queryKey: ciKeys.all(tenantId!) })
        .then(() => undefined),
  });
}
