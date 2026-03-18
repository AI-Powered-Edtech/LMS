import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseService } from '../api/courseService';
import { courseKeys } from './courseKeys';
import { useAuth } from '../../../contexts/AuthContext';
import { CourseInsert, CourseUpdate, FetchCoursesOptions } from '../types';

export function useCourses(filters?: Omit<FetchCoursesOptions, 'tenantId'>) {
    const { tenantId } = useAuth();
    
    return useQuery({
        queryKey: courseKeys.list(tenantId!, filters),
        queryFn: () => courseService.fetchCourses({ tenantId: tenantId!, ...filters }),
        enabled: !!tenantId,
    });
}

export function useCourse(courseId: string) {
    const { tenantId } = useAuth();
    
    return useQuery({
        queryKey: courseKeys.detail(tenantId!, courseId),
        queryFn: () => courseService.getCourseById(courseId, tenantId!),
        enabled: !!tenantId && !!courseId,
    });
}

export function useCreateCourse() {
    const queryClient = useQueryClient();
    const { tenantId } = useAuth();
    
    return useMutation({
        mutationFn: (courseData: CourseInsert) => courseService.createCourse(courseData),
        onSuccess: () => {
            if (tenantId) {
                queryClient.invalidateQueries({ queryKey: courseKeys.all(tenantId) });
            }
        },
    });
}

export function useUpdateCourse() {
    const queryClient = useQueryClient();
    const { tenantId } = useAuth();
    
    return useMutation({
        mutationFn: ({ courseId, updates }: { courseId: string, updates: CourseUpdate }) => 
            courseService.updateCourse(courseId, updates, tenantId!),
        onSuccess: (_, variables) => {
            if (tenantId) {
                queryClient.invalidateQueries({ queryKey: courseKeys.all(tenantId) });
                queryClient.invalidateQueries({ queryKey: courseKeys.detail(tenantId, variables.courseId) });
            }
        },
    });
}

export function useDeleteCourse() {
    const queryClient = useQueryClient();
    const { tenantId } = useAuth();
    
    return useMutation({
        mutationFn: (courseId: string) => courseService.deleteCourse(courseId, tenantId!),
        onSuccess: () => {
            if (tenantId) {
                queryClient.invalidateQueries({ queryKey: courseKeys.all(tenantId) });
            }
        },
    });
}

export function useCheckEnrollment(courseId: string, userId: string) {
    const { tenantId } = useAuth();
    
    return useQuery({
        queryKey: courseKeys.enrollment(tenantId!, courseId, userId),
        queryFn: () => courseService.checkEnrollment(courseId, userId, tenantId!),
        enabled: !!tenantId && !!courseId && !!userId,
    });
}
