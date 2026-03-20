import { useState, useEffect } from "react";
import { assignmentService } from '@/src/features/assignments/api/assignmentService';
import { useAuth } from "@/src/contexts/AuthContext";
import { AssignmentUiState, StudentSubmission, Attachment, Comment } from "../types";

// Raw database response type (snake_case from Supabase)
interface AssignmentDbResponse {
    id: string;
    title: string;
    instructions: string | null;
    due_date: string | null;
    max_points: number;
    assignment_submissions: {
        id: string;
        status: string;
        score: number | null;
        submitted_at: string | null;
        file_url: string | null;
        user_profiles?: { full_name: string };
    }[];
}

export function useAssignments() {
    const { tenantId, user, role } = useAuth();
    const userId = user?.id;
    const [assignments, setAssignments] = useState<AssignmentUiState[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (tenantId && userId) {
            loadAssignments();
        } else {
            setLoading(false);
        }
    }, [tenantId, userId, role]);

    const loadAssignments = async () => {
        try {
            setLoading(true);

            if (!tenantId) return;

            let response;
            if (role === 'teacher' || role === 'admin') {
                response = await assignmentService.getTeacherAssignments(tenantId);
            } else {
                response = await assignmentService.getStudentAssignments(tenantId);
            }

            // Handle both paginated and non-paginated responses for backward compatibility
            const data = Array.isArray(response) ? response : response?.data;

            if (data) {
                // Map database response to UI state with proper typing
                const mapped = data.map((a: AssignmentDbResponse) => {
                    const submissions = a.assignment_submissions || [];

                    // For student, there should be at most 1 submission because RLS filters by their user_id
                    const dbSubmission = submissions.length > 0 ? submissions[0] : null;

                    // Derived status logic for student
                    let status: AssignmentUiState['status'] = "assigned";
                    const now = new Date();
                    const dueDate = a.due_date ? new Date(a.due_date) : null;

                    if (role === 'student') {
                        if (dbSubmission?.score !== null && dbSubmission?.score !== undefined) {
                            status = "graded";
                        } else if (dbSubmission?.submitted_at) {
                            status = "submitted";
                        } else if (dueDate && dueDate < now) {
                            status = "late";
                        } else {
                            status = "assigned";
                        }
                    } else {
                        // Teacher view
                        if (dueDate && dueDate < now) {
                            status = "late";
                        }
                    }

                    return {
                        id: a.id,
                        title: a.title,
                        description: a.instructions || "",
                        dueDate: a.due_date || new Date().toISOString(),
                        maxGrade: a.max_points || 100,
                        type: "individual" as const,
                        status,
                        grade: dbSubmission?.score ?? null,
                        submittedAt: dbSubmission?.submitted_at ?? null,
                        attachments: [],
                        comments: [],
                        studentSubmissions: submissions.map((s): StudentSubmission => ({
                            id: s.id,
                            studentName: (s as any).user_profiles?.full_name || user?.user_metadata?.full_name || "Siswa",
                            status: s.status as StudentSubmission['status'],
                            submittedAt: s.submitted_at,
                            grade: s.score,
                            uploadedFiles: s.file_url ? [{ id: s.id, name: s.file_url.split('/').pop() || 'file', type: 'file', url: s.file_url }] : []
                        }))
                    };
                });
                setAssignments(mapped);
            }
        } catch (error) {
            console.error("Failed to load assignments", error);
        } finally {
            setLoading(false);
        }
    };

    return { assignments, loading, refetch: loadAssignments, setAssignments };
}
