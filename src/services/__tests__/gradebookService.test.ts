import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gradebookService } from '@/src/features/assignments/api/gradebookService';
import { supabase } from '../../lib/supabase';

// Mock the Supabase client
vi.mock('../../lib/supabase', () => {
    return {
        supabase: {
            from: vi.fn(),
        }
    };
});

describe('Gradebook Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockTenantId = 'tenant-123';

    it('should fetch and correctly aggregate gradebook data (Happy Path)', async () => {
        // Mock data
        const mockAssignments = [
            { id: 'a1', title: 'Homework 1', due_date: '2023-10-01T00:00:00.000Z', created_at: '2023-09-01T00:00:00.000Z', tenant_id: "tenant-123" }
        ];

        const mockSubmissions = [
            { id: 's1', assignment_id: 'a1', student_id: 'stu1', status: 'graded', score: 95, feedback: 'Great job!' }
        ];

        const mockProfiles = [
            { id: 'stu1', first_name: 'John', last_name: 'Doe', email: 'john.doe@school.com', tenant_id: "tenant-123" }
        ];

        const mockQuizAttempts = [
            { id: 'qa1', quiz_id: 'q1', student_id: 'stu1', score: 88, status: 'GRADED', tenant_id: "tenant-123" }
        ];

        // Setup the mock chain for supabase.from()
        const mockEqAssignments = vi.fn().mockReturnThis();
        const mockOrderAssignments = vi.fn().mockResolvedValue({ data: mockAssignments, error: null });

        const mockEqSubmissions = vi.fn().mockReturnThis();
        const mockOrderSubmissions = vi.fn().mockResolvedValue({ data: mockSubmissions, error: null });

        const mockEqProfiles = vi.fn().mockReturnThis();
        const mockEqProfilesIsActive = vi.fn().mockResolvedValue({ data: mockProfiles, error: null });

        const mockEqQuizAttempts = vi.fn().mockReturnThis();
        const mockEqQuizAttemptsStatus = vi.fn().mockResolvedValue({ data: mockQuizAttempts, error: null });


        // Configure supabase.from mock behavior
        (supabase.from as any).mockImplementation((table: string) => {
            switch (table) {
                case 'assignments':
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: mockEqAssignments.mockImplementation((key, val) => {
                            if (key === 'tenant_id') return { order: mockOrderAssignments };
                            return { order: mockOrderAssignments };
                        }),
                    };
                case 'assignment_submissions':
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: mockEqSubmissions.mockImplementation((key, val) => {
                             if (key === 'tenant_id') return { order: mockOrderSubmissions };
                             return { order: mockOrderSubmissions };
                        }),
                    };
                case 'profiles':
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: mockEqProfiles.mockImplementation((key, val) => {
                             if (key === 'tenant_id') return { eq: mockEqProfilesIsActive };
                             return { eq: mockEqProfilesIsActive };
                        }),
                    };
                case 'quiz_attempts_v2':
                     return {
                        select: vi.fn().mockReturnThis(),
                        eq: mockEqQuizAttempts.mockImplementation((key, val) => {
                             if (key === 'tenant_id') return { eq: mockEqQuizAttemptsStatus };
                             return { eq: mockEqQuizAttemptsStatus };
                        }),
                    };
                default:
                    return { select: vi.fn().mockReturnThis() };
            }
        });

        const result = await gradebookService.fetchGradebook("tenant-123");

        // Verify the mock interactions
        expect(supabase.from).toHaveBeenCalledWith('assignments');
        expect(supabase.from).toHaveBeenCalledWith('assignment_submissions');
        expect(supabase.from).toHaveBeenCalledWith('profiles');
        expect(supabase.from).toHaveBeenCalledWith('quiz_attempts_v2');

        // Verify aggregated results
        expect(result.assignments).toHaveLength(1);
        expect(result.assignments[0].id).toBe('a1');
        expect(result.assignments[0].title).toBe('Homework 1');

        expect(result.students).toHaveLength(1);
        expect(result.students[0].id).toBe('stu1');
        expect(result.students[0].name).toBe('John Doe');

        // Verify grade matrix
        expect(result.grades['stu1']).toBeDefined();

        // Verify assignment grade
        expect(result.grades['stu1']['a1']).toEqual({
            score: 95,
            status: 'graded',
            feedback: 'Great job!',
            source: 'assignment'
        });

        // Verify quiz grade
        expect(result.grades['stu1']['q1']).toEqual({
            score: 88,
            status: 'graded',
            feedback: undefined,
            source: 'quiz'
        });
    });
});

    it('should handle missing submissions correctly', async () => {
        // Mock data
        const mockAssignments = [
            { id: 'a1', title: 'Homework 1', due_date: '2023-10-01T00:00:00.000Z', created_at: '2023-09-01T00:00:00.000Z', tenant_id: "tenant-123" }
        ];

        // Empty submissions
        const mockSubmissions: any[] = [];

        const mockProfiles = [
            { id: 'stu1', first_name: 'John', last_name: 'Doe', email: 'john.doe@school.com', tenant_id: "tenant-123" }
        ];

        const mockQuizAttempts: any[] = [];

        // Configure supabase.from mock behavior
        (supabase.from as any).mockImplementation((table: string) => {
            switch (table) {
                case 'assignments':
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockAssignments, error: null }) }),
                    };
                case 'assignment_submissions':
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null }) }),
                    };
                case 'profiles':
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }) }),
                    };
                case 'quiz_attempts_v2':
                     return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockQuizAttempts, error: null }) }),
                    };
                default:
                    return { select: vi.fn().mockReturnThis() };
            }
        });

        const result = await gradebookService.fetchGradebook("tenant-123");

        // Verify that the student exists but has no grades mapping
        expect(result.students).toHaveLength(1);
        expect(result.students[0].id).toBe('stu1');

        // grades map should be empty or undefined for stu1's assignments
        expect(result.grades['stu1']).toBeUndefined();
    });

    it('should correctly merge quiz attempts', async () => {
        // Mock data
        const mockAssignments: any[] = [];
        const mockSubmissions: any[] = [];
        const mockProfiles = [
            { id: 'stu1', first_name: 'John', last_name: 'Doe', email: 'john.doe@school.com', tenant_id: "tenant-123" }
        ];

        const mockQuizAttempts = [
            { id: 'qa1', quiz_id: 'q1', student_id: 'stu1', score: 85, status: 'GRADED', tenant_id: "tenant-123" },
            { id: 'qa2', quiz_id: 'q1', student_id: 'stu1', score: 95, status: 'GRADED', tenant_id: "tenant-123" }, // Assume backend returned highest score or multiple attempts exist
        ];

        // Configure supabase.from mock behavior
        (supabase.from as any).mockImplementation((table: string) => {
            switch (table) {
                case 'assignments':
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockAssignments, error: null }) }) };
                case 'assignment_submissions':
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null }) }) };
                case 'profiles':
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }) }) };
                case 'quiz_attempts_v2':
                     return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockQuizAttempts, error: null }) }) };
                default:
                    return { select: vi.fn().mockReturnThis() };
            }
        });

        const result = await gradebookService.fetchGradebook("tenant-123");

        // Assuming fetchGradebook iterates through quiz attempts, the last one in the array with same student_id and quiz_id will overwrite previous.
        expect(result.grades['stu1']['q1']).toEqual({
            score: 95,
            status: 'graded',
            feedback: undefined,
            source: 'quiz'
        });
    });

    it('should return empty gradebook when no students exist', async () => {
        const mockAssignments: any[] = [];
        const mockSubmissions: any[] = [];
        const mockProfiles: any[] = [];
        const mockQuizAttempts: any[] = [];

        (supabase.from as any).mockImplementation((table: string) => {
            switch (table) {
                case 'assignments':
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockAssignments, error: null }) }) };
                case 'assignment_submissions':
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null }) }) };
                case 'profiles':
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }) }) };
                case 'quiz_attempts_v2':
                     return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockQuizAttempts, error: null }) }) };
                default:
                    return { select: vi.fn().mockReturnThis() };
            }
        });

        const result = await gradebookService.fetchGradebook("tenant-123");

        expect(result.students).toEqual([]);
        expect(result.assignments).toEqual([]);
        expect(result.grades).toEqual({});
    });

    it('should throw error when tenantId is missing', async () => {
        (supabase.from as any).mockClear();
        // We shouldn't even mock supabase calls as it should throw early
        await expect(gradebookService.fetchGradebook('')).rejects.toThrow("tenantId is required for fetchGradebook");

        // Assert supabase.from was never called
        expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should handle multiple assignments and students without mixing data', async () => {
        const mockAssignments = [
            { id: 'a1', title: 'Homework 1', due_date: '2023-10-01T00:00:00.000Z', created_at: '2023-09-01T00:00:00.000Z', tenant_id: 'tenant-123' },
            { id: 'a2', title: 'Homework 2', due_date: '2023-10-05T00:00:00.000Z', created_at: '2023-09-05T00:00:00.000Z', tenant_id: 'tenant-123' }
        ];

        const mockSubmissions = [
            { id: 's1', assignment_id: 'a1', student_id: 'stu1', status: 'graded', score: 90, feedback: 'Good' },
            { id: 's2', assignment_id: 'a2', student_id: 'stu1', status: 'graded', score: 80, feedback: 'Okay' },
            { id: 's3', assignment_id: 'a1', student_id: 'stu2', status: 'graded', score: 100, feedback: 'Perfect' },
            // stu2 missing submission for a2
        ];

        const mockProfiles = [
            { id: 'stu1', first_name: 'John', last_name: 'Doe', email: 'john.doe@school.com', tenant_id: 'tenant-123' },
            { id: 'stu2', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@school.com', tenant_id: 'tenant-123' }
        ];

        const mockQuizAttempts = [
            { id: 'qa1', quiz_id: 'q1', student_id: 'stu1', score: 85, status: 'GRADED', tenant_id: 'tenant-123' },
            { id: 'qa2', quiz_id: 'q1', student_id: 'stu2', score: 95, status: 'GRADED', tenant_id: 'tenant-123' },
        ];

        (supabase.from as any).mockImplementation((table: string) => {
            switch (table) {
                case 'assignments':
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockAssignments, error: null }) }) };
                case 'assignment_submissions':
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null }) }) };
                case 'profiles':
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }) }) };
                case 'quiz_attempts_v2':
                     return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: mockQuizAttempts, error: null }) }) };
                default:
                    return { select: vi.fn().mockReturnThis() };
            }
        });

        const result = await gradebookService.fetchGradebook("tenant-123");

        // Verify stu1 data
        expect(result.grades['stu1']['a1'].score).toBe(90);
        expect(result.grades['stu1']['a2'].score).toBe(80);
        expect(result.grades['stu1']['q1'].score).toBe(85);

        // Verify stu2 data
        expect(result.grades['stu2']['a1'].score).toBe(100);
        expect(result.grades['stu2']['a2']).toBeUndefined();
        expect(result.grades['stu2']['q1'].score).toBe(95);
    });

    it('should handle database errors gracefully', async () => {
        const dbError = new Error('Database connection failed');

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'assignments') {
                return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue({ order: vi.fn().mockRejectedValue(dbError) }) };
            }
            return { select: vi.fn().mockReturnThis() };
        });

        await expect(gradebookService.fetchGradebook('tenant-123')).rejects.toThrow('Database connection failed');
    });
